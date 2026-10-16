const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Shown on sign-in errors so a deploy can be confirmed from outside.
const BUILD = "2026-10-16-dev";

// Lets an admin directly fix a player's account: set cash to a specific
// number, set how many shares of a stock they hold, fully reset the account
// (clear positions/orders/transactions and reset cash to the game's starting
// amount), or bring every player's stored cash back in line with their trade
// history. None of this is possible through a plain client call:
// game_members.cash and positions have no client-writable RLS policy at all,
// so this has to run as a privileged edge function instead.
//
// Net worth is computed from the trade history (see src/lib/simLedger.ts),
// so cash and share changes are recorded there too — a change made only to
// the stored balance would be undone by the next reconcile.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Please sign in.", build: BUILD }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes.user;
    if (!user) return json({ error: "Please sign in.", build: BUILD }, 401);

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

    if (action === "ping") return json({ ok: true, build: BUILD });

    if (action === "reconcile_all") {
      const r = await reconcileAll(svc);
      if (!r) return json({ error: "Could not check balances. Please try again." }, 500);
      return json({ ok: true, ...r });
    }

    // ---- Game-level actions (dev console) ----
    const gameId = typeof body.game_id === "string" ? body.game_id : null;

    if (action === "player_summaries") {
      if (!gameId) return json({ error: "game_id is required." }, 400);
      const players = await playerSummaries(svc, SUPABASE_URL, ANON, gameId);
      if (!players) return json({ error: "Could not load players. Please try again." }, 500);
      return json({ ok: true, players });
    }

    if (action === "update_game") {
      if (!gameId) return json({ error: "game_id is required." }, 400);
      const parsed = parseGameChanges(body.changes ?? {});
      if ("error" in parsed) return json({ error: parsed.error }, 400);
      if (!Object.keys(parsed.changes).length) return json({ error: "Nothing to change." }, 400);
      const { data, error } = await svc.from("games").update(parsed.changes).eq("id", gameId).select("*").maybeSingle();
      if (error) {
        console.error("update_game failed", error);
        return json({ error: "Could not save the game settings. Please try again." }, 500);
      }
      if (!data) return json({ error: "Game not found." }, 404);
      // A new starting cash shifts everyone's trade-history cash; sync stored balances.
      if ("starting_cash" in parsed.changes) await reconcileAll(svc);
      return json({ ok: true, game: data });
    }

    if (action === "delete_game") {
      if (!gameId) return json({ error: "game_id is required." }, 400);
      const { data: members, error: mErr } = await svc.from("game_members").select("id").eq("game_id", gameId);
      if (mErr) return json({ error: "Could not read the game's players. Please try again." }, 500);
      const ids = (members ?? []).map((m: { id: string }) => m.id);
      const err = await clearMembers(svc, ids, true);
      if (err) return json({ error: err }, 500);
      const { error } = await svc.from("games").delete().eq("id", gameId);
      if (error) {
        console.error("delete_game failed", error);
        return json({ error: "Could not delete the game. Please try again." }, 500);
      }
      return json({ ok: true, removed_players: ids.length });
    }

    if (!member_id || typeof member_id !== "string") {
      return json({ error: "member_id is required." }, 400);
    }

    if (action === "remove_member") {
      const err = await clearMembers(svc, [member_id], true);
      if (err) return json({ error: err }, 500);
      return json({ ok: true });
    }

    if (action === "set_net_worth") {
      const target = Number(body.net_worth);
      if (!Number.isFinite(target)) return json({ error: "Net worth must be a number." }, 400);
      const ctx = await memberContext(svc, member_id);
      if ("error" in ctx) return json({ error: ctx.error }, ctx.status);
      const history = await memberHistory(svc, member_id);
      if (!history) return json({ error: "Could not read their trade history. Please try again." }, 500);
      const prices = await livePrices(SUPABASE_URL, ANON, history.positions.map((p) => p.symbol));
      const holdings = history.positions.reduce(
        (s, p) => s + (prices.get(String(p.symbol).toUpperCase()) || Number(p.avg_cost)) * Number(p.shares),
        0,
      );
      const current = ledgerCash(ctx.startingCash, history.trades, history.positions) + holdings;
      // Net worth = cash + holdings, so the difference is made up in cash.
      const adjustment = target - current;
      if (Math.abs(adjustment) >= 0.01) {
        const adjErr = await recordCashAdjustment(svc, member_id, adjustment);
        if (adjErr) return json({ error: "Could not update net worth. Please try again." }, 500);
      }
      await reconcileMember(svc, member_id, ctx.startingCash);
      return json({ ok: true, net_worth: target, adjustment: Math.round(adjustment * 100) / 100 });
    }

    if (action === "set_position") {
      const symbol = String(body.symbol ?? "").trim().toUpperCase();
      if (!/^[A-Z0-9.^=-]{1,15}$/.test(symbol)) return json({ error: "Enter a valid ticker symbol." }, 400);
      const target = Number(body.shares);
      if (!Number.isFinite(target) || target < 0) {
        return json({ error: "Shares must be zero or more." }, 400);
      }
      // charge (default): their cash pays for the change at the live price, like
      // a real trade, so net worth doesn't jump. Otherwise the shares are free
      // (or taken away for nothing) and net worth moves by their value.
      const charge = body.charge !== false;

      const ctx = await memberContext(svc, member_id);
      if ("error" in ctx) return json({ error: ctx.error }, ctx.status);

      const price = await livePrice(SUPABASE_URL, ANON, symbol);
      if (!price) return json({ error: `No live price for ${symbol}.` }, 400);

      const { data: pos, error: posErr } = await svc
        .from("positions").select("shares")
        .eq("member_id", member_id).eq("symbol", symbol).maybeSingle();
      if (posErr) {
        console.error("set_position: position lookup failed", posErr);
        return json({ error: "Could not read their position. Please try again." }, 500);
      }

      // apply_order_fill won't flip a short straight to a long, so cover first.
      let cur = pos ? Number(pos.shares) : 0;
      const steps: { side: "buy" | "sell" | "cover"; shares: number }[] = [];
      if (cur < 0) {
        steps.push({ side: "cover", shares: -cur });
        cur = 0;
      }
      if (target > cur) steps.push({ side: "buy", shares: target - cur });
      else if (target < cur) steps.push({ side: "sell", shares: cur - target });

      // Every step goes through the trading engine, so the position's average
      // cost, the cash move and the trade-history row all stay consistent.
      let cashMoved = 0;
      let failure: string | null = null;
      for (const step of steps) {
        const { data: ord, error: oErr } = await svc.from("orders").insert({
          member_id, symbol, side: step.side, order_type: "market",
          shares: step.shares, after_hours: false, status: "pending",
        }).select("id").single();
        if (oErr || !ord) {
          console.error("set_position: order insert failed", oErr);
          failure = "Could not record the change. Please try again.";
          break;
        }
        const { data, error } = await svc.rpc("apply_order_fill", {
          _member_id: member_id, _order_id: ord.id, _symbol: symbol, _side: step.side,
          _shares: step.shares, _price: price,
          _margin_floor: -1e15, // an admin edit isn't limited by buying power
        });
        if (error || data?.error) {
          console.error("set_position: fill failed", error ?? data?.error);
          await svc.from("orders").update({ status: "rejected" }).eq("id", ord.id);
          failure = data?.error ?? "Could not apply the change. Please try again.";
          break;
        }
        cashMoved += (step.side === "sell" ? 1 : -1) * step.shares * price;
      }

      // Free change: hand back (or take back) exactly the cash the steps moved.
      if (!charge && Math.abs(cashMoved) >= 0.01) {
        const adjErr = await recordCashAdjustment(svc, member_id, -cashMoved);
        if (adjErr) failure ??= "Shares changed, but the cash refund failed. Check their cash.";
      }
      await reconcileMember(svc, member_id, ctx.startingCash);
      if (failure) return json({ error: failure }, 400);
      return json({ ok: true, symbol, shares: target, price });
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

    const ctx = await memberContext(svc, member_id);
    if ("error" in ctx) return json({ error: ctx.error }, ctx.status);
    const history = await memberHistory(svc, member_id);
    if (!history) return json({ error: "Could not read their trade history. Please try again." }, 500);

    // Record the difference in the trade history, then sync the stored balance.
    const adjustment = newCash - ledgerCash(ctx.startingCash, history.trades, history.positions);
    if (Math.abs(adjustment) >= 0.01) {
      const adjErr = await recordCashAdjustment(svc, member_id, adjustment);
      if (adjErr) return json({ error: "Could not update cash. Please try again." }, 500);
    }
    const r = await reconcileMember(svc, member_id, ctx.startingCash);
    return json({ ok: true, member: { id: member_id, cash: r?.stored ?? newCash } });
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

// ---------------------------------------------------------------------------
// Trade-history helpers. ledgerCash must match src/lib/simLedger.ts and the
// copy in place-order/index.ts.
// ---------------------------------------------------------------------------

/** Trade-history rows with this symbol are admin cash adjustments, not stock. */
const CASH_ADJUSTMENT_SYMBOL = "$CASH";

interface LedgerTrade { symbol: string; side: string; shares: number; price: number }
interface LedgerPosition { symbol: string; shares: number; avg_cost: number }

function ledgerCash(startingCash: number, trades: LedgerTrade[], positions: LedgerPosition[]): number {
  let cash = Number(startingCash);
  const netShares = new Map<string, number>();
  const avgCost = new Map(positions.map((p) => [String(p.symbol).toUpperCase(), Number(p.avg_cost)]));
  for (const t of trades) {
    const symbol = String(t.symbol).toUpperCase();
    const shares = Number(t.shares);
    const price = Number(t.price);
    let held = netShares.get(symbol) ?? 0;
    // Shares sold (or covered) that the history never shows being bought (or
    // shorted) count as bought at their average cost, or at the sale price if
    // the position is gone — never as pure profit.
    const basis = avgCost.get(symbol) ?? price;
    if (symbol !== CASH_ADJUSTMENT_SYMBOL && t.side === "sell") {
      const missing = shares - Math.max(0, held);
      if (missing > 1e-9) {
        cash -= missing * basis;
        held += missing;
      }
    } else if (symbol !== CASH_ADJUSTMENT_SYMBOL && t.side === "cover") {
      const missing = shares - Math.max(0, -held);
      if (missing > 1e-9) {
        cash += missing * basis;
        held -= missing;
      }
    }
    // Buys and covers spend cash and add shares; sells and shorts do the reverse.
    const spends = t.side === "buy" || t.side === "cover";
    cash += (spends ? -1 : 1) * price * shares;
    netShares.set(symbol, held + (spends ? shares : -shares));
  }
  for (const p of positions) {
    const unexplained = Number(p.shares) - (netShares.get(String(p.symbol).toUpperCase()) ?? 0);
    if (Math.abs(unexplained) > 1e-9) cash -= unexplained * Number(p.avg_cost);
  }
  return Math.round(cash * 100) / 100;
}

/** Reads every page of a query, stopping at an empty page so the API's row cap can't truncate it. */
async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[] | null> {
  const PAGE = 1000;
  const all: T[] = [];
  for (let from = 0; ; ) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) {
      console.error("fetchAll failed", error);
      return null;
    }
    if (!data?.length) return all;
    all.push(...data);
    from += data.length;
  }
}

async function memberContext(
  svc: any,
  member_id: string,
): Promise<{ startingCash: number } | { error: string; status: number }> {
  const { data: member } = await svc.from("game_members").select("game_id").eq("id", member_id).maybeSingle();
  if (!member) return { error: "Player not found.", status: 404 };
  const { data: game } = await svc.from("games").select("starting_cash").eq("id", member.game_id).maybeSingle();
  const startingCash = Number(game?.starting_cash ?? 0);
  if (!(startingCash > 0)) return { error: "Could not read their game. Please try again.", status: 500 };
  return { startingCash };
}

async function memberHistory(
  svc: any,
  member_id: string,
): Promise<{ trades: LedgerTrade[]; positions: LedgerPosition[] } | null> {
  const [trades, positions] = await Promise.all([
    fetchAll<LedgerTrade>((from, to) =>
      svc.from("transactions").select("symbol, side, shares, price")
        .eq("member_id", member_id).order("created_at").order("id").range(from, to)),
    fetchAll<LedgerPosition>((from, to) =>
      svc.from("positions").select("symbol, shares, avg_cost")
        .eq("member_id", member_id).order("id").range(from, to)),
  ]);
  return trades && positions ? { trades, positions } : null;
}

/** Adds (positive) or removes (negative) cash by writing a trade-history row. Returns an error, if any. */
async function recordCashAdjustment(svc: any, member_id: string, amount: number): Promise<unknown> {
  const { error } = await svc.from("transactions").insert({
    member_id,
    order_id: null,
    symbol: CASH_ADJUSTMENT_SYMBOL,
    // A "sell" of $X adds X to cash in the ledger; a "buy" removes it.
    side: amount > 0 ? "sell" : "buy",
    shares: 1,
    price: Math.round(Math.abs(amount) * 100) / 100,
    commission: 0,
  });
  if (error) console.error("recordCashAdjustment failed", error);
  return error;
}

/** Rewrites one player's stored cash to match their trade history. Null (and no write) on any read failure. */
async function reconcileMember(
  svc: any,
  member_id: string,
  startingCash: number,
): Promise<{ stored: number; derived: number } | null> {
  const [history, memberRes] = await Promise.all([
    memberHistory(svc, member_id),
    svc.from("game_members").select("cash").eq("id", member_id).single(),
  ]);
  if (!history || memberRes.error || !memberRes.data) return null;
  const derived = ledgerCash(startingCash, history.trades, history.positions);
  let stored = Number(memberRes.data.cash);
  if (Math.abs(stored - derived) >= 0.01) {
    const { data, error } = await svc
      .from("game_members").update({ cash: derived }).eq("id", member_id).select("cash").single();
    if (error) console.error("reconcileMember: correction failed", error);
    else if (data) stored = Number(data.cash);
  }
  return { stored, derived };
}

/**
 * Brings every player's stored cash in line with their trade history in one
 * pass, so the leaderboard is right even for players who haven't been back
 * since their balance drifted. Null (and no writes) if any read fails.
 */
async function reconcileAll(svc: any): Promise<{ checked: number; fixed: number } | null> {
  const [members, games, positions, trades] = await Promise.all([
    fetchAll<{ id: string; game_id: string; cash: number }>((from, to) =>
      svc.from("game_members").select("id, game_id, cash").order("id").range(from, to)),
    fetchAll<{ id: string; starting_cash: number }>((from, to) =>
      svc.from("games").select("id, starting_cash").order("id").range(from, to)),
    fetchAll<LedgerPosition & { member_id: string }>((from, to) =>
      svc.from("positions").select("member_id, symbol, shares, avg_cost").order("id").range(from, to)),
    fetchAll<LedgerTrade & { member_id: string }>((from, to) =>
      svc.from("transactions").select("member_id, symbol, side, shares, price")
        .order("created_at").order("id").range(from, to)),
  ]);
  if (!members || !games || !positions || !trades) return null;

  const startBy = new Map(games.map((g) => [g.id, Number(g.starting_cash)]));
  const group = <T extends { member_id: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) {
      const list = m.get(r.member_id);
      if (list) list.push(r);
      else m.set(r.member_id, [r]);
    }
    return m;
  };
  const posBy = group(positions);
  const tradesBy = group(trades);

  let fixed = 0;
  for (const m of members) {
    const start = startBy.get(m.game_id) ?? 0;
    if (!(start > 0)) continue;
    const derived = ledgerCash(start, tradesBy.get(m.id) ?? [], posBy.get(m.id) ?? []);
    if (Math.abs(Number(m.cash) - derived) < 0.01) continue;
    const { error } = await svc.from("game_members").update({ cash: derived }).eq("id", m.id);
    if (error) console.error("reconcileAll: correction failed", m.id, error);
    else fixed++;
  }
  return { checked: members.length, fixed };
}

/** Latest price for a symbol, via the same Yahoo proxy the trading engine uses. */
async function livePrice(supabaseUrl: string, anon: string, symbol: string): Promise<number> {
  return (await livePrices(supabaseUrl, anon, [symbol])).get(symbol.toUpperCase()) ?? 0;
}

/** Latest prices for several symbols (uppercase keys). Missing quotes are left out. */
async function livePrices(supabaseUrl: string, anon: string, symbols: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const unique = [...new Set(symbols.map((s) => String(s).toUpperCase()))];
  for (let i = 0; i < unique.length; i += 40) {
    try {
      const res = await fetch(
        `${supabaseUrl}/functions/v1/yahoo-proxy?kind=quote&symbols=${encodeURIComponent(unique.slice(i, i + 40).join(","))}`,
        { headers: { apikey: anon } },
      );
      const results = (await res.json())?.quoteResponse?.result ?? [];
      for (const q of results) {
        const price = Number(q?.regularMarketPrice ?? q?.postMarketPrice ?? 0) || 0;
        if (q?.symbol && price > 0) out.set(String(q.symbol).toUpperCase(), price);
      }
    } catch (e) {
      console.error("livePrices failed", e);
    }
  }
  return out;
}

/**
 * Every player in a game with exact figures from their trade history: cash,
 * holdings at live prices, and net worth. Null if any read fails.
 */
async function playerSummaries(svc: any, supabaseUrl: string, anon: string, gameId: string) {
  const { data: game } = await svc.from("games").select("starting_cash").eq("id", gameId).maybeSingle();
  const startingCash = Number(game?.starting_cash ?? 0);
  if (!(startingCash > 0)) return null;
  const { data: members, error: mErr } = await svc
    .from("game_members").select("id, user_id, cash, joined_at").eq("game_id", gameId);
  if (mErr) return null;
  const ids = (members ?? []).map((m: { id: string }) => m.id);
  if (!ids.length) return [];
  const [positions, trades, profilesRes] = await Promise.all([
    fetchAll<LedgerPosition & { member_id: string }>((from, to) =>
      svc.from("positions").select("member_id, symbol, shares, avg_cost").in("member_id", ids).order("id").range(from, to)),
    fetchAll<LedgerTrade & { member_id: string }>((from, to) =>
      svc.from("transactions").select("member_id, symbol, side, shares, price")
        .in("member_id", ids).order("created_at").order("id").range(from, to)),
    svc.from("profiles").select("user_id, display_name").in("user_id", (members ?? []).map((m: { user_id: string }) => m.user_id)),
  ]);
  if (!positions || !trades) return null;
  const prices = await livePrices(supabaseUrl, anon, positions.map((p) => p.symbol));
  const names = new Map((profilesRes.data ?? []).map((p: { user_id: string; display_name: string }) => [p.user_id, p.display_name]));

  return (members ?? []).map((m: { id: string; user_id: string; cash: number; joined_at: string }) => {
    const pos = positions.filter((p) => p.member_id === m.id);
    const cash = ledgerCash(startingCash, trades.filter((t) => t.member_id === m.id), pos);
    const priced = pos.map((p) => ({
      symbol: p.symbol,
      shares: Number(p.shares),
      avg_cost: Number(p.avg_cost),
      last: prices.get(String(p.symbol).toUpperCase()) || Number(p.avg_cost),
    }));
    const holdings = priced.reduce((s, p) => s + p.last * p.shares, 0);
    return {
      member_id: m.id,
      user_id: m.user_id,
      name: names.get(m.user_id) ?? "Player",
      joined_at: m.joined_at,
      cash,
      stored_cash: Number(m.cash),
      net_worth: Math.round((cash + holdings) * 100) / 100,
      positions: priced,
    };
  });
}

/** Validates the game settings the dev console may change. */
function parseGameChanges(raw: Record<string, unknown>): { changes: Record<string, unknown> } | { error: string } {
  const changes: Record<string, unknown> = {};
  const num = (v: unknown) => (v === null || v === "" ? null : Number(v));
  if ("name" in raw) {
    const name = String(raw.name ?? "").trim();
    if (!name || name.length > 60) return { error: "Game name must be 1–60 characters." };
    changes.name = name;
  }
  if ("starting_cash" in raw) {
    const v = num(raw.starting_cash);
    if (v === null || !Number.isFinite(v) || v <= 0 || v > 1e9) return { error: "Starting cash must be between $1 and $1,000,000,000." };
    changes.starting_cash = v;
  }
  if ("leverage" in raw) {
    const v = num(raw.leverage);
    if (v === null || !Number.isFinite(v) || v < 1 || v > 10) return { error: "Leverage must be between 1× and 10×." };
    changes.leverage = v;
  }
  for (const key of ["allow_short", "is_public"] as const) {
    if (key in raw) {
      if (typeof raw[key] !== "boolean") return { error: `${key} must be true or false.` };
      changes[key] = raw[key];
    }
  }
  if ("min_price" in raw) {
    const v = num(raw.min_price);
    if (v !== null && (!Number.isFinite(v) || v < 0)) return { error: "Minimum price must be $0 or more." };
    changes.min_price = v;
  }
  if ("max_position_pct" in raw) {
    const v = num(raw.max_position_pct);
    if (v !== null && (!Number.isFinite(v) || v <= 0 || v > 100)) return { error: "Max position must be between 1% and 100%." };
    changes.max_position_pct = v;
  }
  if ("ends_at" in raw) {
    if (raw.ends_at === null || raw.ends_at === "") changes.ends_at = null;
    else {
      const t = Date.parse(String(raw.ends_at));
      if (!Number.isFinite(t)) return { error: "End date isn't a valid date." };
      changes.ends_at = new Date(t).toISOString();
    }
  }
  return { changes };
}

/**
 * Deletes players' positions, orders, trade history and net-worth snapshots,
 * and (with removeMembership) the membership rows themselves. Returns an
 * error message, or null on success.
 */
async function clearMembers(svc: any, memberIds: string[], removeMembership: boolean): Promise<string | null> {
  if (!memberIds.length) return null;
  const results = await Promise.all([
    svc.from("positions").delete().in("member_id", memberIds),
    svc.from("transactions").delete().in("member_id", memberIds),
    svc.from("orders").delete().in("member_id", memberIds),
  ]);
  const failed = results.find((r: { error: unknown }) => r.error);
  if (failed) {
    console.error("clearMembers failed", failed.error);
    return "Could not clear their positions and history. Please try again.";
  }
  // portfolio_snapshots may not exist on every deploy yet — best-effort only.
  await svc.from("portfolio_snapshots").delete().in("member_id", memberIds);
  if (removeMembership) {
    const { error } = await svc.from("game_members").delete().in("id", memberIds);
    if (error) {
      console.error("clearMembers: membership delete failed", error);
      return "Could not remove the player. Please try again.";
    }
  }
  return null;
}
