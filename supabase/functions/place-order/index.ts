const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const { member_id, symbol, side, shares, order_type = "market", limit_price, stop_price } =
      await req.json();
    if (!member_id || !symbol || !side || !shares || shares <= 0)
      return json({ error: "invalid input" }, 400);

    // verify membership
    const { data: member, error: mErr } = await userClient
      .from("game_members")
      .select("id, cash, game_id, user_id")
      .eq("id", member_id)
      .single();
    if (mErr || !member || member.user_id !== user.id) return json({ error: "not your portfolio" }, 403);

    // get current price via yahoo-proxy
    const qRes = await fetch(
      `${SUPABASE_URL}/functions/v1/yahoo-proxy?kind=quote&symbols=${encodeURIComponent(symbol)}`,
      { headers: { apikey: ANON } }
    );
    const qJson = await qRes.json();
    const quote = qJson?.quoteResponse?.result?.[0];
    const price = quote?.regularMarketPrice ?? quote?.postMarketPrice;
    if (!price) return json({ error: "no price for symbol" }, 400);

    // Market state
    const isMarketOpen = quote?.marketState === "REGULAR";
    const fillPrice = order_type === "market" ? Number(price) : Number(limit_price ?? price);
    const afterHours = !isMarketOpen;

    // Limit/stop: queue if not crossed
    let willFill = order_type === "market";
    if (order_type === "limit") {
      if (side === "buy" && price <= limit_price) willFill = true;
      if (side === "sell" && price >= limit_price) willFill = true;
    }
    if (order_type === "stop") {
      if (side === "buy" && price >= stop_price) willFill = true;
      if (side === "sell" && price <= stop_price) willFill = true;
    }

    // Insert order
    const { data: ord, error: oErr } = await userClient.from("orders").insert({
      member_id,
      symbol: symbol.toUpperCase(),
      side,
      order_type,
      shares,
      limit_price: limit_price ?? null,
      stop_price: stop_price ?? null,
      after_hours: afterHours,
      status: willFill ? "filled" : "pending",
      filled_price: willFill ? fillPrice : null,
      filled_at: willFill ? new Date().toISOString() : null,
    }).select().single();
    if (oErr) return json({ error: oErr.message }, 400);

    if (!willFill) return json({ ok: true, order: ord, queued: true });

    const cost = fillPrice * Number(shares);

    if (side === "buy") {
      if (Number(member.cash) < cost) return json({ error: "insufficient cash" }, 400);
      // upsert position
      const { data: pos } = await userClient
        .from("positions")
        .select("*")
        .eq("member_id", member_id)
        .eq("symbol", symbol.toUpperCase())
        .maybeSingle();
      if (pos) {
        const newShares = Number(pos.shares) + Number(shares);
        const newAvg = (Number(pos.shares) * Number(pos.avg_cost) + cost) / newShares;
        await userClient.from("positions").update({
          shares: newShares, avg_cost: newAvg,
        }).eq("id", pos.id);
      } else {
        await userClient.from("positions").insert({
          member_id, symbol: symbol.toUpperCase(), shares, avg_cost: fillPrice,
        });
      }
      await userClient.from("game_members").update({ cash: Number(member.cash) - cost }).eq("id", member_id);
    } else {
      // sell
      const { data: pos } = await userClient
        .from("positions").select("*")
        .eq("member_id", member_id).eq("symbol", symbol.toUpperCase()).maybeSingle();
      if (!pos || Number(pos.shares) < Number(shares)) return json({ error: "insufficient shares" }, 400);
      const newShares = Number(pos.shares) - Number(shares);
      if (newShares === 0) {
        await userClient.from("positions").delete().eq("id", pos.id);
      } else {
        await userClient.from("positions").update({ shares: newShares }).eq("id", pos.id);
      }
      await userClient.from("game_members").update({ cash: Number(member.cash) + cost }).eq("id", member_id);
    }

    await userClient.from("transactions").insert({
      member_id, order_id: ord.id, symbol: symbol.toUpperCase(),
      side, shares, price: fillPrice, commission: 0,
    });

    return json({ ok: true, order: ord, filled: true, price: fillPrice });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
