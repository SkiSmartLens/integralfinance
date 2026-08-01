import { useEffect, useState, useRef } from "react";
import { fetchNews, NewsItem } from "@/lib/yahoo";

export function useLiveNews(query: string | string[], refreshMs = 30000) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  const key = Array.isArray(query) ? query.join("|") : query;

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    let timer: number | undefined;
    const query = key.split("|");
    const load = async () => {
      try {
        const n = await fetchNews(query);
        if (mounted.current) setNews(n);
      } catch {
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
  }, [key, refreshMs]);

  return { news, loading };
}
