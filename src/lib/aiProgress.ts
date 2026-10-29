/**
 * What the stock-summary function is doing while AI insights are generated, in
 * the order it does it, and roughly when each step starts. The function doesn't
 * report progress mid-request, so this follows a typical uncached request
 * (about 4–6 seconds): a second or so of gathering data, then the AI's answer.
 */
export const AI_STEPS: { label: string; startMs: number }[] = [
  { label: "Getting today's price and stats", startMs: 0 },
  { label: "Searching for the latest articles", startMs: 300 },
  { label: "Reading the sources", startMs: 700 },
  { label: "Reading SEC financial reports", startMs: 1100 },
  { label: "Weighing the bull and bear case", startMs: 1600 },
  { label: "Translating it into plain English", startMs: 3200 },
  { label: "Checking facts and adding citations", startMs: 5000 },
];

/** After this long, say it's slower than usual (the AI provider is busy and retrying). */
export const SLOW_MS = 12_000;

/**
 * The bar's fill and current step `ms` after the request started. The fill
 * eases toward 95% and never reaches 100%, since the real finish time isn't known.
 */
export function aiProgressAt(ms: number): { percent: number; step: number; slow: boolean } {
  const t = Math.max(0, ms);
  const percent = 95 * (1 - Math.exp(-t / 3000));
  const step = AI_STEPS.reduce((cur, s, i) => (t >= s.startMs ? i : cur), 0);
  return { percent, step, slow: t >= SLOW_MS };
}
