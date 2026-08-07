const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "unauthorized" }, 401);

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

    const body = await req.json();
    const { member_id } = body;
    if (!member_id) return json({ error: "invalid input" }, 400);

    // verify membership + load game (for allow_short)
    const { data: member, error: mErr } = await userClient
      .from("game_members")
      .select("id, cash, game_id, user_id")
      .eq("id", member_id)
      .single();
    if (mErr || !member || member.user_id !== user.id) return json({ error: "not your portfolio" }, 403);

    const { data: game } = await userClient
      .from("games").select("allow_short, starting_cash, leverage").eq("id", member.game_id).single();
    const allowShort = !!(game as any)?.allow_short;
    // Margin: leveraged games let cash go negative down to the borrowed amount.
    const startingCash = Number((game as any)?.starting_cash ?? 0);
    const leverage = Number((game as any)?.leverage ?? 1) || 1;
    const marginFloor = -Math.max(0, startingCash * (leverage - 1));

    // ---- Release orders that were queued for the open ----
    if (body.action === "run_queued") {
      const { data: queued } = await svc
        .from("orders")
        .select("*")
        .eq("member_id", member_id)
        .eq("status", "pending")
        .eq("order_type", "market_on_open")
        .order("created_at", { ascending: true });
      const results: unknown[] = [];
      for (const o of queued ?? []) {
        const q = await getQuote(o.symbol);
        if (!isMarketOpen(q.state) || !q.price) break; // still closed — leave queued
        const r = await fillOrder(svc, member_id, o, q.price, marginFloor);
        results.push({ id: o.id, ...r });
      }
      return json({ ok: true, processed: results });
    }

    // ---- New order ----
    const { symbol, side, shares, order_type = "market", limit_price, stop_price } = body;
    if (!symbol || !side || !shares || shares <= 0) return json({ error: "invalid input" }, 400);
    const validSides = ["buy", "sell", "short", "cover"] as const;
    if (!validSides.includes(side)) return json({ error: "invalid side" }, 400);
    if ((side === "short" || side === "cover") && !allowShort) {
      return json({ error: "shorting is disabled for this game" }, 400);
    }

    const q = await getQuote(symbol);
    if (!q.price) return json({ error: "no price for symbol" }, 400);
    // Yahoo's marketState can occasionally be stale even while the regular
    // session is live. Match the client by falling back to the ET session clock.
    const marketIsOpen = isMarketOpen(q.state);
    const price = q.price;

    const wantsOpenQueue = order_type === "market_on_open";
    if (!marketIsOpen && !wantsOpenQueue) {
      return json(
        { error: "The market is closed. Place it as a market-on-open order instead." },
        400,
      );
    }

    // Queue it for the next open — no cash/position mutation until it fills.
    if (!marketIsOpen && wantsOpenQueue) {
      const { data: ord, error: oErr } = await svc.from("orders").insert({
        member_id,
        symbol: String(symbol).toUpperCase(),
        side,
        order_type: "market_on_open",
        shares,
        after_hours: true,
        status: "pending",
      }).select().single();
      if (oErr) {
        console.error("queue insert failed", oErr);
        return json({ error: "Could not queue order. Please try again." }, 400);
      }
      return json({ ok: true, order: ord, queued: true });
    }

    const fillPrice = order_type === "limit" || order_type === "stop"
      ? Number(limit_price ?? price)
      : Number(price);

    const buyish = side === "buy" || side === "cover";
    let willFill = order_type === "market" || order_type === "market_on_open";
    if (order_type === "limit") {
      if (buyish && price <= limit_price) willFill = true;
      if (!buyish && price >= limit_price) willFill = true;
    }
    if (order_type === "stop") {
      if (buyish && price >= stop_price) willFill = true;
      if (!buyish && price <= stop_price) willFill = true;
    }

    const { data: ord, error: oErr } = await svc.from("orders").insert({
      member_id,
      symbol: String(symbol).toUpperCase(),
      side,
      order_type: order_type === "market_on_open" ? "market" : order_type,
      shares,
      limit_price: limit_price ?? null,
      stop_price: stop_price ?? null,
      after_hours: false,
      status: "pending",
    }).select().single();
    if (oErr) {
      console.error("order insert failed", oErr);
      return json({ error: "Could not place order. Please try again." }, 400);
    }
    if (!willFill) return json({ ok: true, order: ord, queued: true });

    const res = await fillOrder(svc, member_id, ord, fillPrice, marginFloor);
    if (res.error) return json({ error: res.error }, 400);
    return json({ ok: true, order: ord, filled: true, price: fillPrice });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong processing your order." }, 500);
  }
});

async function getQuote(symbol: string) {
  const qRes = await fetch(
    `${SUPABASE_URL}/functions/v1/yahoo-proxy?kind=quote&symbols=${encodeURIComponent(symbol)}`,
    { headers: { apikey: ANON } },
  );
  const qJson = await qRes.json();
  const quote = qJson?.quoteResponse?.result?.[0];
  return {
    price: Number(quote?.regularMarketPrice ?? quote?.postMarketPrice ?? 0) || 0,
    state: quote?.marketState as string | undefined,
  };
}

function isMarketOpen(marketState?: string) {
  if (marketState === "REGULAR") return true;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekday = value("weekday");
  const hourText = value("hour");
  const hour = Number(hourText === "24" ? "0" : hourText);
  const minute = Number(value("minute"));
  const minutes = hour * 60 + minute;

  return weekday !== "Sat" && weekday !== "Sun" && minutes >= 9 * 60 + 30 && minutes < 16 * 60;
}

/** Applies cash/position effects for an order row and marks it filled. */
async function fillOrder(svc: any, member_id: string, ord: any, fillPrice: number, marginFloor = 0) {
  const { data: member } = await svc
    .from("game_members").select("id, cash").eq("id", member_id).single();
  if (!member) return { error: "portfolio not found" };

  const side = ord.side as "buy" | "sell" | "short" | "cover";
  const shares = Number(ord.shares);
  const symbol = String(ord.symbol).toUpperCase();
  const cost = fillPrice * shares;

  const { data: pos } = await svc
    .from("positions").select("*")
    .eq("member_id", member_id).eq("symbol", symbol).maybeSingle();
  const cur = pos ? Number(pos.shares) : 0;
  const curAvg = pos ? Number(pos.avg_cost) : 0;

  const fail = async (msg: string) => {
    await svc.from("orders").update({ status: "rejected" }).eq("id", ord.id);
    return { error: msg };
  };

  if (side === "buy") {
    if (Number(member.cash) - cost < marginFloor) return await fail("insufficient buying power");
    if (cur < 0) return await fail("you have a short position — use COVER");
    const newShares = cur + shares;
    const newAvg = cur > 0 ? (cur * curAvg + cost) / newShares : fillPrice;
    if (pos) await svc.from("positions").update({ shares: newShares, avg_cost: newAvg }).eq("id", pos.id);
    else await svc.from("positions").insert({ member_id, symbol, shares, avg_cost: fillPrice });
    await svc.from("game_members").update({ cash: Number(member.cash) - cost }).eq("id", member_id);
  } else if (side === "sell") {
    if (cur <= 0 || cur < shares) return await fail("insufficient shares");
    const newShares = cur - shares;
    if (newShares === 0) await svc.from("positions").delete().eq("id", pos!.id);
    else await svc.from("positions").update({ shares: newShares }).eq("id", pos!.id);
    await svc.from("game_members").update({ cash: Number(member.cash) + cost }).eq("id", member_id);
  } else if (side === "short") {
    if (cur > 0) return await fail("you have a long position — SELL first");
    const newShares = cur - shares;
    const absOld = Math.abs(cur);
    const absNew = Math.abs(newShares);
    const newAvg = absOld > 0 ? (absOld * curAvg + shares * fillPrice) / absNew : fillPrice;
    if (pos) await svc.from("positions").update({ shares: newShares, avg_cost: newAvg }).eq("id", pos.id);
    else await svc.from("positions").insert({ member_id, symbol, shares: -shares, avg_cost: fillPrice });
    await svc.from("game_members").update({ cash: Number(member.cash) + cost }).eq("id", member_id);
  } else if (side === "cover") {
    if (cur >= 0) return await fail("no short position to cover");
    if (Math.abs(cur) < shares) return await fail("cover size exceeds short");
    if (Number(member.cash) - cost < marginFloor) return await fail("insufficient buying power to cover");
    const newShares = cur + shares;
    if (newShares === 0) await svc.from("positions").delete().eq("id", pos!.id);
    else await svc.from("positions").update({ shares: newShares }).eq("id", pos!.id);
    await svc.from("game_members").update({ cash: Number(member.cash) - cost }).eq("id", member_id);
  }

  await svc.from("orders").update({
    status: "filled",
    filled_price: fillPrice,
    filled_at: new Date().toISOString(),
  }).eq("id", ord.id);

  await svc.from("transactions").insert({
    member_id, order_id: ord.id, symbol,
    side, shares, price: fillPrice, commission: 0,
  });

  return { filled: true, price: fillPrice };
}

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
