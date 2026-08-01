import { useEffect, useState, useRef, useCallback } from "react";
import { fetchChart, ChartResult } from "@/lib/yahoo";

export function useLiveChart(
  symbol: string,
  range: string,
  interval: string,
  refreshMs = 3000,
  includePrePost = false,
) {
  const [data, setData] = useState<ChartResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(true);

  const refetch = useCallback(() => {
    setError(null);
    setLoading(true);
    setAttempt((a) => a + 1);
  }, []);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    let timer: number | undefined;
    const load = async () => {
      try {
        const r = await fetchChart(symbol, range, interval, includePrePost);
        if (!mounted.current) return;
        setData(r);
        setError(null);
      } catch (e: any) {
        if (!mounted.current) return;
        // Only surface an error if we have nothing to show.
        setError((prev) => (data ? prev : e?.message || "Market data unavailable"));
      } finally {
        if (mounted.current) setLoading(false);
      }
    };
    load();
    timer = window.setInterval(load, refreshMs);
    return () => {
      mounted.current = false;
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, range, interval, refreshMs, includePrePost, attempt]);

  return { data, loading, error, refetch };
}
