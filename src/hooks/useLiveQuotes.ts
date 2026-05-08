import { useEffect, useRef, useState } from "react";
import { fetchQuotes, Quote } from "@/lib/yahoo";

// Module-level cache shared across all useLiveQuotes consumers.
// Dedupes in-flight requests for identical symbol sets and serves
// instant cached data on mount so multiple watchlists don't refetch.
const quoteCache = new Map<string, { exp: number; quotes: Quote[] }>();
const inflight = new Map<string, Promise<Quote[]>>();
const CACHE_TTL = 10_000;

async function getQuotesShared(symbols: string[]): Promise<Quote[]> {
  const key = symbols.slice().sort().join(",");
  const hit = quoteCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.quotes;
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = fetchQuotes(symbols)
    .then((q) => {
      quoteCache.set(key, { exp: Date.now() + CACHE_TTL, quotes: q });
      return q;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export function useLiveQuotes(symbols: string[], intervalMs = 15000) {
  const symbolsKey = symbols.slice().sort().join(",");
  const initial = quoteCache.get(symbolsKey)?.quotes ?? [];
  const [quotes, setQuotes] = useState<Quote[]>(initial);
  const [loading, setLoading] = useState(initial.length === 0);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let timer: number | undefined;
    const load = async () => {
      try {
        const q = await getQuotesShared(symbols);
        if (!mounted.current) return;
        setQuotes(q);
        setError(null);
      } catch (e: any) {
        if (mounted.current) setError(e.message);
      } finally {
        if (mounted.current) setLoading(false);
      }
    };
    load();
    timer = window.setInterval(load, intervalMs);
    return () => {
      mounted.current = false;
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey, intervalMs]);

  return { quotes, loading, error };
}
