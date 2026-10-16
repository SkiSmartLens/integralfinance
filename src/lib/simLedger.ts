// Keep in sync with the copy in supabase/functions/place-order/index.ts.

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
 * Shares the history doesn't account for (e.g. a position an admin set by
 * hand) are treated as bought at their average cost, so they aren't free money.
 */
export function ledgerCash(startingCash: number, trades: LedgerTrade[], positions: LedgerPosition[]): number {
  let cash = Number(startingCash);
  const netShares = new Map<string, number>();
  for (const t of trades) {
    const symbol = t.symbol.toUpperCase();
    const shares = Number(t.shares);
    const amount = Number(t.price) * shares;
    // Buys and covers spend cash and add shares; sells and shorts do the reverse.
    const spends = t.side === "buy" || t.side === "cover";
    cash += spends ? -amount : amount;
    netShares.set(symbol, (netShares.get(symbol) ?? 0) + (spends ? shares : -shares));
  }
  for (const p of positions) {
    const unexplained = Number(p.shares) - (netShares.get(p.symbol.toUpperCase()) ?? 0);
    if (Math.abs(unexplained) > 1e-9) cash -= unexplained * Number(p.avg_cost);
  }
  return Math.round(cash * 100) / 100;
}
