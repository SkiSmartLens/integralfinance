const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Lets an admin directly set a player's cash — e.g. to clean up a corrupted
// balance from a historical bug, or reset a test account. game_members.cash
// has no client-writable RLS policy at all (writes only ever happen through
// the trading engine's service-role calls), so this has to run as a
// privileged edge function rather than a plain client update.
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

    const { member_id, cash } = await req.json();
    if (!member_id || typeof member_id !== "string") {
      return json({ error: "member_id is required." }, 400);
    }
    const newCash = Number(cash);
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
