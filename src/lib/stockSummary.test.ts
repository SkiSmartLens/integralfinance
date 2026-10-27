import { describe, it, expect } from "vitest";
import { stanceLabel, stanceTone } from "./stockSummary";

describe("stanceLabel", () => {
  it("names each band the same way on both sides of balanced", () => {
    expect(stanceLabel(0)).toBe("Balanced");
    expect(stanceLabel(10)).toBe("Balanced");
    expect(stanceLabel(-10)).toBe("Balanced");
    expect(stanceLabel(11)).toBe("Leaning bullish");
    expect(stanceLabel(-29)).toBe("Leaning bearish");
    expect(stanceLabel(30)).toBe("Bullish");
    expect(stanceLabel(-59)).toBe("Bearish");
    expect(stanceLabel(60)).toBe("Strongly bullish");
    expect(stanceLabel(-100)).toBe("Strongly bearish");
  });
  it("colors only the scores that aren't balanced", () => {
    expect(stanceTone(10)).toBe("neutral");
    expect(stanceTone(11)).toBe("up");
    expect(stanceTone(-11)).toBe("down");
  });
});
