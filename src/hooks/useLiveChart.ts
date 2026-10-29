import { useEffect, useState, useCallback } from "react";
import { fetchChart, ChartResult } from "@/lib/yahoo";

// Latest result per symbol/range, so switching back to a range shows it at once.
const recent = new Map<string, ChartResult>();
const MAX_RECENT = 40;

export function useLiveChart(
  symbol: string,
  range: string,
  interval: string,
  refreshMs = 3000,
  includePrePost = false,
) {
  const key = `${symbol}|${range}|${interval}|${includePrePost ? 1 : 0}`;
  const [result, setResult] = useState<{ key: string; data: ChartResult } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const refetch = useCallback(() => {
    setError(null);
    setLoading(true);
    setAttempt((a) => a + 1);
  }, []);

  useEffect(() => {
    // Per request set: a reply that arrives after the user picked another range
    // (or stock) is dropped instead of being shown under the new one.
    let alive = true;
    setLoading(true);
    setError(null);
    const load = async () => {
      try {
        const r = await fetchChart(symbol, range, interval, includePrePost);
        if (!alive) return;
        recent.delete(key);
        recent.set(key, r);
        if (recent.size > MAX_RECENT) recent.delete(recent.keys().next().value!);
        setResult({ key, data: r });
        setError(null);
      } catch (e: any) {
        if (!alive) return;
        // Only surface an error if we have nothing to show.
        setError((prev) => (recent.has(key) ? prev : e?.message || "Market data unavailable"));
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const timer = window.setInterval(load, refreshMs);
    return () => {
      alive = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, refreshMs, attempt]);

  // Only data for the range asked for: while a new range loads, nothing (or what
  // it showed last time), never the previous range under the new range's label.
  const data = result?.key === key ? result.data : recent.get(key) ?? null;
  return { data, loading, error, refetch };
}
