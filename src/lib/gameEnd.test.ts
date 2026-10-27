import { describe, it, expect } from "vitest";
import { gameEndLabel } from "./gameEnd";

// Local times, so the tests pass in any time zone.
const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute);

describe("gameEndLabel", () => {
  it("counts calendar days, not 24-hour blocks", () => {
    const now = at(27, 22);
    expect(gameEndLabel(at(30, 9).toISOString(), now)?.label).toBe("Ends in 3 days");
    expect(gameEndLabel(at(28, 1).toISOString(), now)?.label).toBe("Ends tomorrow");
    expect(gameEndLabel(at(27, 23, 59).toISOString(), now)?.label).toBe("Ends today");
  });
  it("says the game is over once the end time has passed", () => {
    expect(gameEndLabel(at(27, 9).toISOString(), at(27, 10))).toEqual({ label: "Game over", days: 0, over: true });
  });
  it("shows nothing for games without an end date", () => {
    expect(gameEndLabel(null)).toBeNull();
    expect(gameEndLabel("not a date")).toBeNull();
  });
  it("is right across the daylight-saving change", () => {
    // US clocks go back on Nov 1, 2026, so that week has a 25-hour day.
    expect(gameEndLabel(new Date(2026, 10, 4, 12).toISOString(), at(30, 12))?.days).toBe(5);
  });
});
