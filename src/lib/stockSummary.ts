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
  sources?: SummarySource[];
}

const TTL = 1000 * 60 * 30;
const mem = new Map<string, StockSummaryData>();
const inflight = new Map<string, Promise<StockSummaryData>>();

const keyFor = (symbol: string, mode?: string) => `sum:${mode ?? "full"}:${symbol.toUpperCase()}`;

function readPersisted(key: string): StockSummaryData | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { exp, data } = JSON.parse(raw);
    if (typeof exp === "number" && exp > Date.now()) return data as StockSummaryData;
    sessionStorage.removeItem(key);
  } catch { /* ignore */ }
  return null;
}

function persist(key: string, data: StockSummaryData) {
  try { sessionStorage.setItem(key, JSON.stringify({ exp: Date.now() + TTL, data })); } catch { /* ignore */ }
}

/** Cached summary if we already have one (instant render, no network). */
export function getCachedSummary(symbol: string, mode?: string): StockSummaryData | null {
  const key = keyFor(symbol, mode);
  const hit = mem.get(key) ?? readPersisted(key);
  if (hit) mem.set(key, hit);
  return hit ?? null;
}

/**
 * Fetch (or reuse) the AI summary for a symbol.
 * Concurrent callers for the same symbol share one request, and results are
 * cached in memory + sessionStorage so re-visits render instantly.
 */
export function fetchStockSummary(symbol: string, mode?: string): Promise<StockSummaryData> {
  const key = keyFor(symbol, mode);
  const cached = getCachedSummary(symbol, mode);
  if (cached) return Promise.resolve(cached);

  const existing = inflight.get(key);
  if (existing) return existing;

  const p = supabase.functions
    .invoke("stock-summary", { body: mode ? { symbol, mode } : { symbol } })
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
      const result = data as StockSummaryData;
      mem.set(key, result);
      persist(key, result);
      return result;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, p);
  return p;
}

/** Warm the cache without caring about the result (e.g. on hover / mount). */
export function prefetchStockSummary(symbol: string, mode?: string) {
  if (!symbol) return;
  fetchStockSummary(symbol, mode).catch(() => {});
}
