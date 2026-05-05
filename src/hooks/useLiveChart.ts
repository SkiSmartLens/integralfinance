import { useEffect, useState, useRef } from "react";
import { fetchChart, ChartResult } from "@/lib/yahoo";

export function useLiveChart(symbol: string, range: string, interval: string, refreshMs = 20000) {
  const [data, setData] = useState<ChartResult | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    let timer: number | undefined;
    const load = async () => {
      try {
        const r = await fetchChart(symbol, range, interval);
        if (!mounted.current) return;
        setData(r);
      } catch (e) {
        // ignore
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
  }, [symbol, range, interval, refreshMs]);

  return { data, loading };
}
