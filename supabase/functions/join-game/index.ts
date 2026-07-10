const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Please sign in to join a game." }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes.user;
    if (!user) return json({ error: "Please sign in to join a game." }, 401);

    const { code } = await req.json();
    const joinCode = String(code ?? "").trim().toUpperCase();
    if (!joinCode) return json({ error: "Enter a join code." }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

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

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}