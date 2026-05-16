import { useCallback, useEffect, useState } from "react";

export interface WidgetDef {
  id: string;
  label: string;
  desc: string;
}

export const WIDGET_REGISTRY: WidgetDef[] = [
  { id: "top_gainers", label: "Top Gainers", desc: "Best performing stocks today" },
  { id: "top_losers", label: "Top Losers", desc: "Worst performing stocks today" },
  { id: "most_active", label: "Most Active", desc: "Highest volume names" },
  { id: "trending", label: "Trending", desc: "Most searched on Yahoo Finance" },
  { id: "sectors", label: "Sectors", desc: "Sector ETF heatmap" },
  { id: "indices", label: "Indices", desc: "Major global indices" },
  { id: "my_watchlist", label: "My Watchlist", desc: "Your saved tickers" },
];

const DEFAULT_ORDER = ["top_gainers", "top_losers", "sectors", "indices"];
const KEY = "widgets.order.v2";

function load(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_ORDER;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return DEFAULT_ORDER;
    const valid = arr.filter((x) => typeof x === "string" && WIDGET_REGISTRY.some((w) => w.id === x));
    return valid.length ? valid : DEFAULT_ORDER;
  } catch {
    return DEFAULT_ORDER;
  }
}

export function useWidgets() {
  const [order, setOrder] = useState<string[]>(() => load());

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(order));
  }, [order]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setOrder(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((id: string) => {
    if (!WIDGET_REGISTRY.some((w) => w.id === id)) return;
    setOrder((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const remove = useCallback((id: string) => {
    setOrder((prev) => prev.filter((x) => x !== id));
  }, []);

  const reorder = useCallback((next: string[]) => {
    const valid = next.filter((x) => WIDGET_REGISTRY.some((w) => w.id === x));
    if (valid.length) setOrder(valid);
  }, []);

  const reset = useCallback(() => setOrder(DEFAULT_ORDER), []);

  return { order, add, remove, reorder, reset };
}
