import { describe, it, expect } from "vitest";
import { cleanPrizes, placeLabel, prizeList } from "./prizes";

describe("placeLabel", () => {
  it("names places the usual way", () => {
    expect([1, 2, 3, 4, 10, 11, 12, 13, 21, 22, 23, 101, 111].map(placeLabel)).toEqual([
      "1st", "2nd", "3rd", "4th", "10th", "11th", "12th", "13th", "21st", "22nd", "23rd", "101st", "111th",
    ]);
  });
});

describe("prizeList", () => {
  it("reads a game's prizes, 1st place first", () => {
    expect(prizeList(["$20 gift card", " $10 gift card "])).toEqual(["$20 gift card", "$10 gift card"]);
  });
  it("is empty for games from before prizes, or anything that isn't a list of text", () => {
    expect(prizeList(undefined)).toEqual([]);
    expect(prizeList(null)).toEqual([]);
    expect(prizeList({ first: "x" })).toEqual([]);
    expect(prizeList([1, "", "Trophy"])).toEqual(["Trophy"]);
  });
});

describe("cleanPrizes", () => {
  it("drops blank rows and trims, keeping the order", () => {
    expect(cleanPrizes(["  $50 ", "", "   ", "Bragging rights"])).toEqual(["$50", "Bragging rights"]);
  });
  it("keeps to what the database takes", () => {
    expect(cleanPrizes(Array.from({ length: 12 }, (_, i) => `Prize ${i}`))).toHaveLength(10);
    expect(cleanPrizes(["x".repeat(200)])[0]).toHaveLength(120);
  });
});
