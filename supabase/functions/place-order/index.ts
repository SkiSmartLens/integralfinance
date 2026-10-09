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
      .from("games").select("allow_short, starting_cash, leverage, min_price, max_position_pct").eq("id", member.game_id).single();
    const allowShort = !!(game as any)?.allow_short;
    // Margin: leveraged games let cash go negative down to the borrowed amount.
    const startingCash = Number((game as any)?.starting_cash ?? 0);
    const leverage = Number((game as any)?.leverage ?? 1) || 1;
    const marginFloor = -Math.max(0, startingCash * (leverage - 1));
    const minPrice = (game as any)?.min_price != null ? Number((game as any).min_price) : null;
    const maxPositionPct = (game as any)?.max_position_pct != null ? Number((game as any).max_position_pct) : null;
    const rules = { marginFloor, minPrice, maxPositionPct, startingCash };

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
        const r = await fillOrder(svc, member_id, o, q.price, rules);
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

    const res = await fillOrder(svc, member_id, ord, fillPrice, rules);
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

interface FillRules {
  marginFloor?: number;
  /** No tradable price below this — blocks opening/adding exposure, never blocks closing it. */
  minPrice?: number | null;
  /** Max % of starting capital a single symbol's notional may reach when opening/adding exposure. */
  maxPositionPct?: number | null;
  startingCash?: number;
}

/**
 * Applies cash/position effects for an order row and marks it filled.
 *
 * This used to do the cash update as a separate, unchecked `.update()` call
 * after writing the position — with no `.error` check on any of the writes.
 * If that cash write silently failed (a rejected trigger, a dropped request,
 * anything) the function had no way to know: it still inserted the position,
 * inserted a transaction row, and marked the order "filled", so the trade
 * looked successful while the shares showed up with no cash ever leaving the
 * account — net worth inflated by the full trade amount. `apply_order_fill`
 * (added in a prior migration but never actually wired up here) does the
 * whole fill — lock the portfolio row, move cash, write the position, mark
 * the order filled, log the transaction — as one atomic, row-locked RPC call
 * with a single error outcome, so a partial failure is no longer possible.
 */
async function fillOrder(
  svc: any,
  member_id: string,
  ord: any,
  fillPrice: number,
  rules: FillRules = {},
): Promise<{ error?: string; filled?: boolean; price?: number }> {
  const side = ord.side as "buy" | "sell" | "short" | "cover";
  const shares = Number(ord.shares);
  const symbol = String(ord.symbol).toUpperCase();

  const fail = async (msg: string) => {
    await svc.from("orders").update({ status: "rejected" }).eq("id", ord.id);
    return { error: msg };
  };

  // Entry rules (min price / max position %) only gate opening/adding exposure
  // (buy, short) — you can always close a position, even one that no longer
  // fits the game's rules (e.g. a stock that gapped below the min price
  // overnight). apply_order_fill doesn't know about these per-game custom
  // rules, so they're checked here first against a fresh read of the position.
  if (side === "buy" || side === "short") {
    const { data: pos } = await svc
      .from("positions").select("shares")
      .eq("member_id", member_id).eq("symbol", symbol).maybeSingle();
    const cur = pos ? Number(pos.shares) : 0;
    const newNotionalShares = side === "buy" ? cur + shares : Math.abs(cur - shares);
    if (rules.minPrice && fillPrice < rules.minPrice) {
      return await fail(`This game requires stocks priced at least $${rules.minPrice.toFixed(2)} — ${symbol} is $${fillPrice.toFixed(2)}.`);
    }
    if (rules.maxPositionPct && rules.startingCash) {
      const cap = rules.startingCash * (rules.maxPositionPct / 100);
      const notional = newNotionalShares * fillPrice;
      if (notional > cap) {
        return await fail(`That would put $${notional.toFixed(0)} in ${symbol} — this game caps a single stock at ${rules.maxPositionPct}% of starting capital ($${cap.toFixed(0)}).`);
      }
    }
  }

  const { data, error } = await svc.rpc("apply_order_fill", {
    _member_id: member_id,
    _order_id: ord.id,
    _symbol: symbol,
    _side: side,
    _shares: shares,
    _price: fillPrice,
    _margin_floor: rules.marginFloor ?? 0,
  });
  if (error) {
    console.error("apply_order_fill rpc failed", error);
    return await fail("Something went wrong filling your order. Please try again.");
  }
  if (data?.error) return await fail(data.error);

  return { filled: true, price: fillPrice };
}

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
