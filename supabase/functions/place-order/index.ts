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
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    // Service-role client bypasses the `enforce_game_members_cash` trigger,
    // which only lets the trading engine mutate cash. All order fills go through here.
    const svc = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const { member_id, symbol, side, shares, order_type = "market", limit_price, stop_price } =
      await req.json();
    if (!member_id || !symbol || !side || !shares || shares <= 0)
      return json({ error: "invalid input" }, 400);
    const validSides = ["buy", "sell", "short", "cover"] as const;
    if (!validSides.includes(side)) return json({ error: "invalid side" }, 400);

    // verify membership + load game (for allow_short)
    const { data: member, error: mErr } = await userClient
      .from("game_members")
      .select("id, cash, game_id, user_id")
      .eq("id", member_id)
      .single();
    if (mErr || !member || member.user_id !== user.id) return json({ error: "not your portfolio" }, 403);

    const { data: game } = await userClient
      .from("games").select("allow_short").eq("id", member.game_id).single();
    const allowShort = !!(game as any)?.allow_short;
    if ((side === "short" || side === "cover") && !allowShort) {
      return json({ error: "shorting is disabled for this game" }, 400);
    }

    const qRes = await fetch(
      `${SUPABASE_URL}/functions/v1/yahoo-proxy?kind=quote&symbols=${encodeURIComponent(symbol)}`,
      { headers: { apikey: ANON } }
    );
    const qJson = await qRes.json();
    const quote = qJson?.quoteResponse?.result?.[0];
    const price = quote?.regularMarketPrice ?? quote?.postMarketPrice;
    if (!price) return json({ error: "no price for symbol" }, 400);

    const isMarketOpen = quote?.marketState === "REGULAR";
    const fillPrice = order_type === "market" ? Number(price) : Number(limit_price ?? price);
    const afterHours = !isMarketOpen;

    // For long/buy + cover, treat as "buying" direction. Limit/stop crossing is the same.
    const buyish = side === "buy" || side === "cover";
    let willFill = order_type === "market";
    if (order_type === "limit") {
      if (buyish && price <= limit_price) willFill = true;
      if (!buyish && price >= limit_price) willFill = true;
    }
    if (order_type === "stop") {
      if (buyish && price >= stop_price) willFill = true;
      if (!buyish && price <= stop_price) willFill = true;
    }

    // Persist the order using the original side so the UI shows short/cover.
    // DB has no check constraint on side text.
    const { data: ord, error: oErr } = await svc.from("orders").insert({
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
    if (oErr) {
      console.error("order insert failed", oErr);
      return json({ error: "Could not place order. Please try again." }, 400);
    }
    if (!willFill) return json({ ok: true, order: ord, queued: true });

    const cost = fillPrice * Number(shares);

    // Load any existing position (positions.shares may be negative for shorts).
    const { data: pos } = await svc
      .from("positions").select("*")
      .eq("member_id", member_id).eq("symbol", symbol.toUpperCase()).maybeSingle();
    const cur = pos ? Number(pos.shares) : 0;
    const curAvg = pos ? Number(pos.avg_cost) : 0;

    if (side === "buy") {
      if (Number(member.cash) < cost) return json({ error: "insufficient cash" }, 400);
      if (cur < 0) return json({ error: "you have a short position — use COVER" }, 400);
      const newShares = cur + Number(shares);
      const newAvg = cur > 0 ? (cur * curAvg + cost) / newShares : fillPrice;
      if (pos) await svc.from("positions").update({ shares: newShares, avg_cost: newAvg }).eq("id", pos.id);
      else await svc.from("positions").insert({ member_id, symbol: symbol.toUpperCase(), shares, avg_cost: fillPrice });
      await svc.from("game_members").update({ cash: Number(member.cash) - cost }).eq("id", member_id);
    } else if (side === "sell") {
      if (cur <= 0 || cur < Number(shares)) return json({ error: "insufficient shares" }, 400);
      const newShares = cur - Number(shares);
      if (newShares === 0) await svc.from("positions").delete().eq("id", pos!.id);
      else await svc.from("positions").update({ shares: newShares }).eq("id", pos!.id);
      await svc.from("game_members").update({ cash: Number(member.cash) + cost }).eq("id", member_id);
    } else if (side === "short") {
      if (cur > 0) return json({ error: "you have a long position — SELL first" }, 400);
      const newShares = cur - Number(shares); // more negative
      const absOld = Math.abs(cur);
      const absNew = Math.abs(newShares);
      const newAvg = absOld > 0 ? (absOld * curAvg + Number(shares) * fillPrice) / absNew : fillPrice;
      if (pos) await svc.from("positions").update({ shares: newShares, avg_cost: newAvg }).eq("id", pos.id);
      else await svc.from("positions").insert({ member_id, symbol: symbol.toUpperCase(), shares: -Number(shares), avg_cost: fillPrice });
      // Short proceeds credited to cash (simplified — no margin tracking).
      await svc.from("game_members").update({ cash: Number(member.cash) + cost }).eq("id", member_id);
    } else if (side === "cover") {
      if (cur >= 0) return json({ error: "no short position to cover" }, 400);
      if (Math.abs(cur) < Number(shares)) return json({ error: "cover size exceeds short" }, 400);
      if (Number(member.cash) < cost) return json({ error: "insufficient cash to cover" }, 400);
      const newShares = cur + Number(shares); // toward zero
      if (newShares === 0) await svc.from("positions").delete().eq("id", pos!.id);
      else await svc.from("positions").update({ shares: newShares }).eq("id", pos!.id);
      await svc.from("game_members").update({ cash: Number(member.cash) - cost }).eq("id", member_id);
    }

    await svc.from("transactions").insert({
      member_id, order_id: ord.id, symbol: symbol.toUpperCase(),
      side, shares, price: fillPrice, commission: 0,
    });

    return json({ ok: true, order: ord, filled: true, price: fillPrice });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong processing your order." }, 500);
  }
});

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

