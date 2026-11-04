import { describe, it, expect } from "vitest";
import { cleanPrizes, placeLabel, prizeList, prizeSaveError, storedPrizes } from "./prizes";
import { coverLayout } from "./cropImage";

const PHOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";

describe("placeLabel", () => {
  it("names places the usual way", () => {
    expect([1, 2, 3, 4, 10, 11, 12, 13, 21, 22, 23, 101, 111].map(placeLabel)).toEqual([
      "1st", "2nd", "3rd", "4th", "10th", "11th", "12th", "13th", "21st", "22nd", "23rd", "101st", "111th",
    ]);
  });
});

describe("prizeList", () => {
  it("reads names saved before photos, and names with photos", () => {
    expect(prizeList([" $20 gift card ", { text: "Pizza", image: PHOTO }, { text: "", image: PHOTO }])).toEqual([
      { text: "$20 gift card" },
      { text: "Pizza", image: PHOTO },
      { text: "", image: PHOTO },
    ]);
  });
  it("is empty for games from before prizes, and skips anything else", () => {
    expect(prizeList(undefined)).toEqual([]);
    expect(prizeList({ first: "x" })).toEqual([]);
    expect(prizeList([1, "", { text: "" }, { text: "Link", image: "https://example.com/x.png" }, "Trophy"])).toEqual([
      { text: "Link" },
      { text: "Trophy" },
    ]);
  });
});

describe("cleanPrizes", () => {
  it("drops rows with neither a name nor a photo, and trims, keeping the order", () => {
    expect(cleanPrizes([{ text: "  $50 " }, { text: "" }, { text: "  ", image: PHOTO }, { text: "Bragging rights" }])).toEqual([
      { text: "$50" },
      { text: "", image: PHOTO },
      { text: "Bragging rights" },
    ]);
  });
  it("keeps to what the database takes", () => {
    expect(cleanPrizes(Array.from({ length: 12 }, (_, i) => ({ text: `Prize ${i}` })))).toHaveLength(10);
    expect(cleanPrizes([{ text: "x".repeat(200) }])[0].text).toHaveLength(120);
  });
});

describe("storedPrizes", () => {
  it("saves a prize without a photo as its name alone, as before photos", () => {
    expect(storedPrizes([{ text: "$50" }, { text: "Pizza", image: PHOTO }])).toEqual(["$50", { text: "Pizza", image: PHOTO }]);
  });
});

describe("prizeSaveError", () => {
  it("explains a photo turned down by a database without the photos update", () => {
    expect(prizeSaveError('violates check constraint "games_prizes_list"', [{ text: "x", image: PHOTO }])).toMatch(/latest simulator database update/);
    expect(prizeSaveError("Prizes must be up to 10, each 1-120 characters", [{ text: "x", image: PHOTO }])).toMatch(/Remove the photos/);
  });
  it("passes anything else through", () => {
    expect(prizeSaveError("Only the game's creator can change its prizes.", [{ text: "x", image: PHOTO }])).toBe("Only the game's creator can change its prizes.");
    expect(prizeSaveError("Prizes must be up to 10, each 1-120 characters", [{ text: "x" }])).toBe("Prizes must be up to 10, each 1-120 characters");
  });
});

describe("coverLayout", () => {
  it("fits a wide photo to the box's height, centered", () => {
    expect(coverLayout(400, 200, 100, 1, { x: 0, y: 0 })).toEqual({ w: 200, h: 100, x: 0, y: 0, left: -50, top: 0 });
  });
  it("can move it sideways only as far as its edges", () => {
    expect(coverLayout(400, 200, 100, 1, { x: 80, y: 30 })).toMatchObject({ x: 50, y: 0, left: 0, top: 0 });
    expect(coverLayout(400, 200, 100, 1, { x: -80, y: 0 })).toMatchObject({ left: -100 });
  });
  it("zooming in lets it move further, and never shrinks it below the box", () => {
    expect(coverLayout(200, 200, 100, 2, { x: 70, y: -70 })).toEqual({ w: 200, h: 200, x: 50, y: -50, left: 0, top: -100 });
    expect(coverLayout(200, 200, 100, 0.5, { x: 0, y: 0 })).toMatchObject({ w: 100, h: 100 });
  });
});
