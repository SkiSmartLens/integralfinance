import { describe, it, expect } from "vitest";
import { citedSources, researchedFrom, stanceLabel, stanceTone, type BullBearCase } from "./stockSummary";

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
