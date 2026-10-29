import { describe, it, expect } from "vitest";
import { AI_STEPS, SLOW_MS, aiProgressAt } from "./aiProgress";

describe("aiProgressAt", () => {
  it("starts empty on the first step", () => {
    expect(aiProgressAt(0)).toEqual({ percent: 0, step: 0, slow: false });
  });
  it("moves forward and never fills the bar before the answer arrives", () => {
    let prev = aiProgressAt(0);
    for (let ms = 100; ms <= 60_000; ms += 100) {
      const cur = aiProgressAt(ms);
      expect(cur.percent).toBeGreaterThan(prev.percent);
      expect(cur.percent).toBeLessThan(95);
      expect(cur.step).toBeGreaterThanOrEqual(prev.step);
      prev = cur;
    }
  });
  it("reaches the AI steps within a typical request", () => {
    expect(AI_STEPS[aiProgressAt(2000).step].label).toBe("Weighing the bull and bear case");
    expect(AI_STEPS[aiProgressAt(4500).step].label).toBe("Translating it into plain English");
    expect(aiProgressAt(8000).step).toBe(AI_STEPS.length - 1);
  });
  it("says it's slow only after a long wait", () => {
    expect(aiProgressAt(SLOW_MS - 1).slow).toBe(false);
    expect(aiProgressAt(SLOW_MS).slow).toBe(true);
  });
});
