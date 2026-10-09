const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Lets an admin directly fix a player's balance — either set cash to a
// specific number, or fully reset the account (clear positions/orders/
// transactions and reset cash to the game's starting amount). Neither is
// possible through a plain client call: game_members.cash and positions
// have no client-writable RLS policy at all, so this has to run as a
// privileged edge function instead.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Please sign in." }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes.user;
    if (!user) return json({ error: "Please sign in." }, 401);

    const svc = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    const { data: roleRow } = await svc
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Admin access required." }, 403);

    const body = await req.json();
    const { member_id, action } = body;
    if (!member_id || typeof member_id !== "string") {
      return json({ error: "member_id is required." }, 400);
    }

    if (action === "reset") {
      const { data: member, error: memberErr } = await svc
        .from("game_members")
        .select("id, game_id")
        .eq("id", member_id)
        .maybeSingle();
      if (memberErr) {
        console.error("admin reset: member lookup failed", memberErr);
        return json({ error: "Could not reset player. Please try again." }, 500);
      }
      if (!member) return json({ error: "Player not found." }, 404);

      const { data: game, error: gameErr } = await svc
        .from("games")
        .select("starting_cash")
        .eq("id", member.game_id)
        .maybeSingle();
      if (gameErr || !game) {
        console.error("admin reset: game lookup failed", gameErr);
        return json({ error: "Could not reset player. Please try again." }, 500);
      }

      // Clearing positions before game_members (not strictly required by FKs,
      // but keeps the reset atomic-in-intent and matches what a fresh
      // membership row would look like).
      const [posRes, txRes, orderRes] = await Promise.all([
        svc.from("positions").delete().eq("member_id", member_id),
        svc.from("transactions").delete().eq("member_id", member_id),
        svc.from("orders").delete().eq("member_id", member_id),
      ]);
      if (posRes.error || txRes.error || orderRes.error) {
        console.error("admin reset: clear failed", posRes.error, txRes.error, orderRes.error);
        return json({ error: "Could not clear positions/history. Please try again." }, 500);
      }
      // portfolio_snapshots may not exist on every deploy yet — best-effort only.
      await svc.from("portfolio_snapshots").delete().eq("member_id", member_id);

      const { data: updated, error: updateErr } = await svc
        .from("game_members")
        .update({ cash: game.starting_cash })
        .eq("id", member_id)
        .select("id, cash, user_id")
        .maybeSingle();
      if (updateErr || !updated) {
        console.error("admin reset: cash update failed", updateErr);
        return json({ error: "Could not reset cash. Please try again." }, 500);
      }
      return json({ ok: true, member: updated });
    }

    const newCash = Number(body.cash);
    if (!Number.isFinite(newCash)) {
      return json({ error: "cash must be a number." }, 400);
    }

    const { data: member, error: memberErr } = await svc
      .from("game_members")
      .update({ cash: newCash })
      .eq("id", member_id)
      .select("id, cash, user_id")
      .maybeSingle();
    if (memberErr) {
      console.error("admin-set-cash update failed", memberErr);
      return json({ error: "Could not update cash. Please try again." }, 500);
    }
    if (!member) return json({ error: "Player not found." }, 404);

    return json({ ok: true, member });
  } catch (e) {
    console.error("admin-set-cash failed", e);
    return json({ error: "Something went wrong." }, 500);
  }
});

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
