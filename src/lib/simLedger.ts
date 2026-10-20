// Keep ledgerCash in sync with the copies in supabase/functions/place-order
// and supabase/functions/admin-set-cash.

/**
 * Trade-history rows with this symbol are admin cash adjustments, not stock
 * (a "sell" of 1 share at $X adds X to cash; a "buy" removes it). ledgerCash
 * handles them like any other trade; no position ever has this symbol.
 */
export const CASH_ADJUSTMENT_SYMBOL = "$CASH";

export interface LedgerTrade {
  symbol: string;
  side: "buy" | "sell" | "short" | "cover";
  shares: number;
  price: number;
}

export interface LedgerPosition {
  symbol: string;
  shares: number;
  avg_cost: number;
}

/**
 * The cash a simulator player should have according to their trade history:
 * starting cash, minus every buy/cover, plus every sell/short. This is what
 * makes net worth "starting cash + gains" — it never depends on the stored
 * game_members.cash balance, which has drifted (a buy adding its cost to net
 * worth instead of moving it from cash into shares).
 *
 * Shares the history doesn't account for are never free money:
 * - still held (e.g. a position an admin set by hand): treated as bought at
 *   the position's average cost;
 * - sold (or covered) without the history ever showing them bought (or
 *   shorted): treated as bought at the position's average cost if it's still
 *   open, otherwise at the sale price — so selling them adds no gain, rather
 *   than adding the whole sale as if it were profit.
 */
export function ledgerCash(startingCash: number, trades: LedgerTrade[], positions: LedgerPosition[]): number {
  let cash = Number(startingCash);
  const netShares = new Map<string, number>();
  const avgCost = new Map(positions.map((p) => [p.symbol.toUpperCase(), Number(p.avg_cost)]));
  for (const t of trades) {
    const symbol = t.symbol.toUpperCase();
    const shares = Number(t.shares);
    const price = Number(t.price);
    let held = netShares.get(symbol) ?? 0;
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
    const unexplained = Number(p.shares) - (netShares.get(p.symbol.toUpperCase()) ?? 0);
    if (Math.abs(unexplained) > 1e-9) cash -= unexplained * Number(p.avg_cost);
  }
  return Math.round(cash * 100) / 100;
}

/**
 * Net worth for a player whose trade history we can't read (other players on
 * the leaderboard and in the admin panel). The live trading engine has been
 * leaving the stored cash balance untouched when orders fill, which counts
 * every purchase twice (once as cash, once as shares). So a stored balance
 * still sitting exactly at the starting amount while they hold stock isn't
 * trusted: net worth is then starting cash + their open positions' gains.
 *
 * cashSynced: the database keeps stored cash equal to the trade history
 * (see simAdmin.cashSynced), so it's always trusted.
 */
export function estimatedNetWorth(
  startingCash: number,
  storedCash: number,
  positions: { shares: number; avgCost: number; last: number }[],
  cashSynced = false,
): number {
  const value = positions.reduce((s, p) => s + p.last * p.shares, 0);
  const cost = positions.reduce((s, p) => s + p.avgCost * p.shares, 0);
  const untouched = !cashSynced && positions.length > 0 && Math.abs(storedCash - startingCash) < 0.01;
  return untouched ? startingCash + (value - cost) : storedCash + value;
}

/**
 * Whether a player has made a trade, judged from what the leaderboard can see.
 * Other players' trade history is private, but any trade leaves them holding
 * stock or with cash that has moved off the starting amount.
 */
export function hasTraded(startingCash: number, cash: number, positionCount: number): boolean {
  return positionCount > 0 || Math.abs(cash - startingCash) >= 0.01;
}

/**
 * The most a buy may cost: leverage × the cash you have. With 2× and $10k in
 * cash that's $20k; with no cash left, or cash already borrowed below zero,
 * it's $0. Same rule as apply_order_fill in
 * supabase/migrations/20261020190000_sim_leverage_multiplies_cash.sql.
 */
export function buyLimit(cash: number, leverage: number): number {
  return Math.max(1, leverage) * Math.max(0, cash);
}

export interface DayTrade extends LedgerTrade {
  created_at?: string;
}

/**
 * Today's gain/loss on one symbol. Shares held since before today move from
 * yesterday's close; shares traded today move from the price they traded at.
 * So -0.2% on a $100k position is -$200, never a mix of close and fill prices.
 */
export function dayPnl(
  currentShares: number,
  last: number,
  prevClose: number,
  todaysTrades: LedgerTrade[],
): number {
  let net = 0;
  let fromFills = 0;
  for (const t of todaysTrades) {
    const signed = t.side === "buy" || t.side === "cover" ? Number(t.shares) : -Number(t.shares);
    net += signed;
    fromFills += signed * (last - Number(t.price));
  }
  const heldOvernight = currentShares - net;
  return heldOvernight * (last - prevClose) + fromFills;
}
