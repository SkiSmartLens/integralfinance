const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Shown on sign-in errors so a deploy can be confirmed from outside.
const BUILD = "2026-10-16-dev";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Please sign in to join a game.", build: BUILD }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes.user;
    if (!user) return json({ error: "Please sign in to join a game.", build: BUILD }, 401);

    const body = await req.json();

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // Lets the dev console confirm which build is deployed.
    if (body.action === "ping") return json({ ok: true, build: BUILD });

    if (body.action === "cleanup_empty_games") {
      const removed = await removeEmptyGames(admin, typeof body.game_id === "string" ? body.game_id : null);
      return json({ ok: true, removed });
    }

    const joinCode = String(body.code ?? "").trim().toUpperCase();
    if (!joinCode) return json({ error: "Enter a join code." }, 400);

    const { data: game, error: gameError } = await admin
      .from("games")
      .select("id, starting_cash, join_code")
      .eq("join_code", joinCode)
      .maybeSingle();

    if (gameError) {
      console.error("join game lookup failed", gameError);
      return json({ error: "Could not join game. Please try again." }, 500);
    }
    if (!game) return json({ error: "Game not found. Double-check the code." }, 404);

    const { error: memberError } = await admin
      .from("game_members")
      .upsert(
        { game_id: game.id, user_id: user.id, cash: game.starting_cash },
        { onConflict: "game_id,user_id", ignoreDuplicates: true },
      );

    if (memberError) {
      console.error("join game membership failed", memberError);
      return json({ error: "Could not join game. Please try again." }, 500);
    }

    return json({ id: game.id, join_code: game.join_code });
  } catch (e) {
    console.error("join game failed", e);
    return json({ error: "Could not join game. Please try again." }, 500);
  }
});

/**
 * Deletes games nobody is in. Any signed-in visitor can trigger it — it only
 * ever removes games with zero players, so there's nothing to abuse.
 *
 * - With a game_id (someone just left it): removed straight away if empty.
 * - Otherwise: every empty game older than an hour.
 * The minimum age covers the gap between creating a game and its creator's
 * membership row being added, so a brand-new game is never caught mid-setup.
 *
 * game_members cascades on game delete, but an empty game has none anyway.
 */
async function removeEmptyGames(admin: any, gameId: string | null): Promise<number> {
  let candidates: string[];
  if (gameId) {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data, error } = await admin
      .from("games").select("id").eq("id", gameId).lt("created_at", cutoff).maybeSingle();
    if (error) return logFail("game", error);
    candidates = data ? [data.id] : [];
  } else {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const games: string[] = [];
    const memberGames = new Set<string>();
    for (let from = 0; ; ) {
      const { data, error } = await admin
        .from("games").select("id").lt("created_at", cutoff).order("id").range(from, from + 999);
      if (error) return logFail("games", error);
      if (!data?.length) break;
      games.push(...data.map((g: { id: string }) => g.id));
      from += data.length;
    }
    for (let from = 0; ; ) {
      const { data, error } = await admin
        .from("game_members").select("game_id").order("id").range(from, from + 999);
      if (error) return logFail("game_members", error);
      if (!data?.length) break;
      data.forEach((m: { game_id: string }) => memberGames.add(m.game_id));
      from += data.length;
    }
    candidates = games.filter((id) => !memberGames.has(id));
  }

  let removed = 0;
  for (let i = 0; i < candidates.length; i += 100) {
    const chunk = candidates.slice(i, i + 100);
    // Re-check right before deleting, so a player who joined a moment ago
    // doesn't lose their game.
    const { data: live, error: liveErr } = await admin
      .from("game_members").select("game_id").in("game_id", chunk);
    if (liveErr) return logFail("recheck", liveErr, removed);
    const occupied = new Set((live ?? []).map((m: { game_id: string }) => m.game_id));
    const empty = chunk.filter((id) => !occupied.has(id));
    if (!empty.length) continue;
    const { data: gone, error } = await admin.from("games").delete().in("id", empty).select("id");
    if (error) return logFail("delete", error, removed);
    removed += gone?.length ?? 0;
  }
  return removed;
}

function logFail(step: string, error: unknown, removed = 0): number {
  console.error(`removeEmptyGames: ${step} failed`, error);
  return removed;
}

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}