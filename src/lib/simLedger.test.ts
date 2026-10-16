import { describe, it, expect } from "vitest";
import { dayPnl } from "./simLedger";

describe("dayPnl", () => {
  it("a 0.2% drop on $100k held overnight is -$200", () => {
    expect(dayPnl(1000, 99.8, 100, [])).toBeCloseTo(-200);
  });
  it("shares bought today count from their fill price, not yesterday's close", () => {
    // bought 1000 at 100 today; yesterday closed at 105; now 99.8
    expect(dayPnl(1000, 99.8, 105, [{ symbol: "X", side: "buy", shares: 1000, price: 100 }])).toBeCloseTo(-200);
  });
});
