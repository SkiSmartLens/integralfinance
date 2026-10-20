import { describe, it, expect } from "vitest";
import { buyLimit, dayPnl, estimatedNetWorth, hasTraded, ledgerCash } from "./simLedger";

describe("ledgerCash", () => {
  it("buying moves money from cash into shares, so net worth stays $100k", () => {
    const cash = ledgerCash(100000, [{ symbol: "AAPL", side: "buy", shares: 100, price: 110 }], [
      { symbol: "AAPL", shares: 100, avg_cost: 110 },
    ]);
    expect(cash).toBeCloseTo(89000);
    expect(cash + 100 * 110).toBeCloseTo(100000);
  });
  it("selling adds only the gain to $100k", () => {
    const trades = [
      { symbol: "AAPL", side: "buy" as const, shares: 400, price: 250 },
      { symbol: "AAPL", side: "sell" as const, shares: 400, price: 252 },
    ];
    expect(ledgerCash(100000, trades, [])).toBeCloseTo(100800);
  });
  it("borrowing with 2x leverage doesn't change net worth", () => {
    const cash = ledgerCash(100000, [{ symbol: "NVDA", side: "buy", shares: 1000, price: 150 }], [
      { symbol: "NVDA", shares: 1000, avg_cost: 150 },
    ]);
    expect(cash).toBeCloseTo(-50000);
    expect(cash + 1000 * 150).toBeCloseTo(100000);
  });
  it("admin cash adjustments ($CASH rows) add and remove cash", () => {
    const trades = [
      { symbol: "$CASH", side: "sell" as const, shares: 1, price: 5000 },
      { symbol: "$CASH", side: "buy" as const, shares: 1, price: 2000 },
      { symbol: "$CASH", side: "sell" as const, shares: 1, price: 700 },
    ];
    expect(ledgerCash(100000, trades, [])).toBeCloseTo(103700);
  });
  it("a sale whose purchase was never recorded isn't counted as profit", () => {
    expect(ledgerCash(100000, [{ symbol: "AAPL", side: "sell", shares: 400, price: 250 }], [])).toBeCloseTo(100000);
  });
});

describe("estimatedNetWorth", () => {
  it("ignores a stored balance that never moved off the start", () => {
    expect(estimatedNetWorth(100000, 100000, [{ shares: 40, avgCost: 250, last: 255 }])).toBeCloseTo(100200);
  });
  it("trusts a stored balance that has moved", () => {
    expect(estimatedNetWorth(100000, 90000, [{ shares: 40, avgCost: 250, last: 255 }])).toBeCloseTo(100200);
  });
});

describe("dayPnl", () => {
  it("a 0.2% drop on $100k held overnight is -$200", () => {
    expect(dayPnl(1000, 99.8, 100, [])).toBeCloseTo(-200);
  });
  it("shares bought today count from their fill price, not yesterday's close", () => {
    // bought 1000 at 100 today; yesterday closed at 105; now 99.8
    expect(dayPnl(1000, 99.8, 105, [{ symbol: "X", side: "buy", shares: 1000, price: 100 }])).toBeCloseTo(-200);
  });
});

describe("hasTraded", () => {
  it("a player who just joined has no rank", () => {
    expect(hasTraded(100_000, 100_000, 0)).toBe(false);
  });

  it("holding any stock counts, even with cash still at the start (old engine)", () => {
    expect(hasTraded(100_000, 100_000, 1)).toBe(true);
  });

  it("selling everything still counts, because cash moved off the start", () => {
    expect(hasTraded(100_000, 100_412.37, 0)).toBe(true);
  });
});

describe("buyLimit", () => {
  it("2x leverage doubles the cash you have, not the starting cash", () => {
    expect(buyLimit(0.01, 2)).toBeCloseTo(0.02);
    expect(buyLimit(100_000, 2)).toBe(200_000);
  });
  it("no cash, or cash already borrowed, leaves nothing to borrow against", () => {
    expect(buyLimit(0, 2)).toBe(0);
    expect(buyLimit(-50_000, 2)).toBe(0);
  });
  it("1x (or no leverage set) is just your cash", () => {
    expect(buyLimit(1_000, 1)).toBe(1_000);
    expect(buyLimit(1_000, 0)).toBe(1_000);
  });
});
