import { supabase } from "@/lib/backend";

export interface SummarySource { title: string; publisher: string; url: string }
export interface StockSummaryData {
  whyMoved?: string;
  whatItDoes?: string;
  positives?: string[];
  negatives?: string[];
  predictedRevenue?: string;
  revenueGrowth?: string;
  earningsGrowth?: string;
  margins?: string;
  balanceSheet?: string;
  moat?: string;
  earnings?: string;
  forecast?: string;
  outlook?: string;
  /** Where the AI puts the stock between its bear case (-100) and bull case (100). */
  stanceScore?: number;
  /** One sentence on why the score lands where it does. */
  stanceReason?: string;
  sources?: SummarySource[];
}

/** One argument in a bull or bear case: a short title and the reasoning behind it. */
export interface CasePoint { title: string; detail: string }

/**
 * A stock's researched bull and bear case (the bull-bear-case function): a few
 * titled points per side, where the AI weighs them, and what it read to get
 * there. `[n]` citations in the text point into `sources` (1-based).
 */
export interface BullBearCase {
  bull: CasePoint[];
  bear: CasePoint[];
  stanceScore?: number;
  stanceReason?: string;
  sources: SummarySource[];
  basis?: {
    annualReport: { form: string; filed: string } | null;
    resultsRelease: { filed: string } | null;
    articles: number;
  };
  asOf?: string;
}

/** "Leaning bullish" etc. for a stanceScore; the bands are even on both sides of 0. */
export function stanceLabel(score: number): string {
  const a = Math.abs(score);
  if (a <= 10) return "Balanced";
  const side = score > 0 ? "bullish" : "bearish";
  if (a < 30) return `Leaning ${side}`;
  if (a < 60) return side[0].toUpperCase() + side.slice(1);
  return `Strongly ${side}`;
}

/** Green, red or neutral for a stanceScore, matching stanceLabel's "Balanced" band. */
export const stanceTone = (score: number): "up" | "down" | "neutral" =>
  score > 10 ? "up" : score < -10 ? "down" : "neutral";

const TTL = 1000 * 60 * 30;
const mem = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

const keyFor = (symbol: string, mode?: string) => `sum:${mode ?? "full"}:${symbol.toUpperCase()}`;
const bullBearKey = (symbol: string) => `bullbear:${symbol.toUpperCase()}`;

function readPersisted<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { exp, data } = JSON.parse(raw);
    if (typeof exp === "number" && exp > Date.now()) return data as T;
    sessionStorage.removeItem(key);
  } catch { /* ignore */ }
  return null;
}

function persist(key: string, data: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify({ exp: Date.now() + TTL, data })); } catch { /* ignore */ }
}

function getCached<T>(key: string): T | null {
  const hit = (mem.get(key) as T | undefined) ?? readPersisted<T>(key);
  if (hit) mem.set(key, hit);
  return hit ?? null;
}

/**
 * Calls an AI edge function once per key: concurrent callers share the request,
 * and the result is cached in memory + sessionStorage so re-visits render
 * instantly. `check` rejects a reply that can't be shown.
 */
function invokeCached<T>(key: string, fn: string, body: Record<string, unknown>, check?: (data: T) => boolean): Promise<T> {
  const cached = getCached<T>(key);
  if (cached) return Promise.resolve(cached);

  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const p = supabase.functions
    .invoke(fn, { body })
    .then(async ({ data, error }) => {
      if (error) {
        let msg = error.message;
        const res = (error as unknown as { context?: Response })?.context;
        if (res && typeof res.json === "function") {
          try {
            const body = await res.json();
            if (body?.error) msg = body.error;
          } catch { /* ignore */ }
        }
        throw new Error(msg);
      }
      if ((data as { unavailable?: boolean; error?: string })?.unavailable) {
        throw new Error((data as { error?: string }).error || "Rate limit, try again shortly.");
      }
      const result = data as T;
      if (check && !check(result)) throw new Error("The AI's answer was incomplete.");
      mem.set(key, result);
      persist(key, result);
      return result;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, p);
  return p;
}

/** Cached summary if we already have one (instant render, no network). */
export function getCachedSummary(symbol: string, mode?: string): StockSummaryData | null {
  return getCached<StockSummaryData>(keyFor(symbol, mode));
}

/**
 * Fetch (or reuse) the AI summary for a symbol.
 * Concurrent callers for the same symbol share one request, and results are
 * cached in memory + sessionStorage so re-visits render instantly.
 */
export function fetchStockSummary(symbol: string, mode?: string): Promise<StockSummaryData> {
  return invokeCached<StockSummaryData>(keyFor(symbol, mode), "stock-summary", mode ? { symbol, mode } : { symbol });
}

/** Cached bull and bear case if we already have one. */
export function getCachedBullBear(symbol: string): BullBearCase | null {
  return getCached<BullBearCase>(bullBearKey(symbol));
}

/**
 * Fetch (or reuse) the researched bull and bear case for a symbol. Rejects when
 * the function isn't deployed yet or the AI is busy; callers fall back to the
 * summary's shorter positives and negatives.
 */
export function fetchBullBear(symbol: string): Promise<BullBearCase> {
  return invokeCached<BullBearCase>(
    bullBearKey(symbol),
    "bull-bear-case",
    { symbol },
    (d) => Array.isArray(d?.bull) && d.bull.length > 0 && Array.isArray(d?.bear) && d.bear.length > 0,
  );
}

/** Each source cited somewhere in the case, with its citation number, in number order. */
export function citedSources(c: BullBearCase): { n: number; source: SummarySource }[] {
  const text = [...c.bull, ...c.bear].map((p) => p.detail).join(" ");
  const nums = new Set([...text.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
  return [...nums]
    .sort((a, b) => a - b)
    .filter((n) => c.sources?.[n - 1]?.url)
    .map((n) => ({ n, source: c.sources[n - 1] }));
}

const shortDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/**
 * What the case was researched from, for the line under it: "Researched from
 * Apple Inc.'s annual report (10-K, Oct 31, 2025), its latest quarterly results
 * (Jul 30, 2026) and 12 recent news stories."
 */
export function researchedFrom(c: BullBearCase, company: string): string {
  const b = c.basis;
  if (!b) return "";
  const parts: string[] = [];
  if (b.annualReport) parts.push(`${company}'s annual report (${b.annualReport.form}, ${shortDate(b.annualReport.filed)})`);
  if (b.resultsRelease) parts.push(`${parts.length ? "its" : `${company}'s`} latest quarterly results (${shortDate(b.resultsRelease.filed)})`);
  if (b.articles > 0) parts.push(`${b.articles} recent news ${b.articles === 1 ? "story" : "stories"}`);
  if (!parts.length) return "";
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
  return `Researched from ${list}.`;
}

/** Warm the cache without caring about the result (e.g. on hover / mount). */
export function prefetchStockSummary(symbol: string, mode?: string) {
  if (!symbol) return;
  fetchStockSummary(symbol, mode).catch(() => {});
}
