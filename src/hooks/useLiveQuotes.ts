import { useEffect, useState, useRef } from "react";
import { fetchQuotes, Quote } from "@/lib/yahoo";

export function useLiveQuotes(symbols: string[], intervalMs = 15000) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const symbolsKey = symbols.join(",");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let timer: number | undefined;
    const load = async () => {
      try {
        const q = await fetchQuotes(symbols);
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
