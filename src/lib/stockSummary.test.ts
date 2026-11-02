import { describe, it, expect } from "vitest";
import { citedSources, hasInsight, researchedFrom, stanceLabel, stanceTone, type BullBearCase } from "./stockSummary";

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

describe("bull and bear case helpers", () => {
  const c: BullBearCase = {
    bull: [
      { title: "R2 Ramp", detail: "R2 outsold R1 [2] and UBS upgraded the stock [5]." },
      { title: "Cash Runway", detail: "No citation here." },
    ],
    bear: [{ title: "Losses Continue", detail: "Guidance still shows a loss [2][1]; see [9]." }],
    sources: [
      { title: "Rivian 10-K", publisher: "SEC filing", url: "https://sec.gov/a" },
      { title: "Q3 release", publisher: "SEC filing", url: "https://sec.gov/b" },
      { title: "x", publisher: "y", url: "" },
      { title: "x", publisher: "y", url: "https://x" },
      { title: "UBS upgrade", publisher: "MT Newswires", url: "https://c" },
    ],
    basis: { annualReport: { form: "10-K", filed: "2026-02-12" }, resultsRelease: { filed: "2026-10-29" }, articles: 12 },
  };

  it("lists each cited source once, in number order, skipping numbers with no link", () => {
    expect(citedSources(c).map((s) => [s.n, s.source.title])).toEqual([
      [1, "Rivian 10-K"],
      [2, "Q3 release"],
      [5, "UBS upgrade"],
    ]);
  });

  it("says what the case was researched from", () => {
    expect(researchedFrom(c, "Rivian")).toBe(
      "Researched from Rivian's annual report (10-K, Feb 12, 2026), its latest quarterly results (Oct 29, 2026) and 12 recent news stories.",
    );
    expect(researchedFrom({ ...c, basis: { annualReport: null, resultsRelease: null, articles: 1 } }, "SPY")).toBe(
      "Researched from 1 recent news story.",
    );
    expect(researchedFrom({ ...c, basis: { annualReport: null, resultsRelease: { filed: "2026-10-29" }, articles: 0 } }, "Acme")).toBe(
      "Researched from Acme's latest quarterly results (Oct 29, 2026).",
    );
    expect(researchedFrom({ ...c, basis: undefined }, "Acme")).toBe("");
  });
});

describe("hasInsight", () => {
  it("hides empty fields and ones that only say the data is missing", () => {
    for (const t of [
      undefined,
      "",
      "  ",
      "Not enough reported data to estimate",
      "No specific data available for SPY. This may apply more to individual operating companies than to indices, ETFs, or funds.",
      "Margin numbers are not provided in the available data, so we cannot quantify gross, operating, or net margins or compare them to peers.",
      "Balance‑sheet specifics such as cash, debt, or leverage are not disclosed, therefore no concrete balance‑sheet assessment can be made.",
      "Without a disclosed revenue figure or YoY growth rate, we cannot compute a precise growth trajectory.",
      "The provided data does not include any historical revenue figures or YoY growth rates, so a quantitative revenue growth trajectory cannot be stated.",
      "Margin details (gross, operating, net) are not included in the data set, so a direct comparison to peers cannot be made.",
      "Margin metrics such as gross, operating or net margin are not reported for an index‑tracking ETF, and thus cannot be compared to peers.",
      "Balance‑sheet specifics like cash balances or debt levels are not supplied for this ETF, so a leverage assessment is not possible.",
      "No explicit EPS trend is provided, so forward EPS growth cannot be precisely stated.",
    ]) {
      expect(hasInsight(t), String(t)).toBe(false);
    }
  });
  it("keeps real analysis, even when it mentions something missing", () => {
    for (const t of [
      "~$480B, from $466.8B over the last 12 months growing about 3% a year.",
      "Gross margin improved to 50.1% in the latest quarter versus 46.9% for FY2025.",
      "Apple holds $39.5B in cash against $82.3B of long-term debt.",
      "No dividend is paid, so all cash goes to buybacks and R&D.",
    ]) {
      expect(hasInsight(t), t).toBe(true);
    }
  });
});
