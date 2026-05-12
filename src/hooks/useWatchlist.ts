import { useEffect, useState, useCallback } from "react";

const KEY = "watchlist.symbols.v1";

function load(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function useWatchlist() {
  const [symbols, setSymbols] = useState<string[]>(() => load());

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(symbols));
  }, [symbols]);

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setSymbols(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((sym: string) => {
    const s = sym.trim().toUpperCase();
    if (!s) return;
    setSymbols((prev) => (prev.includes(s) ? prev : [...prev, s]));
  }, []);

  const remove = useCallback((sym: string) => {
    setSymbols((prev) => prev.filter((s) => s !== sym.toUpperCase()));
  }, []);

  const has = useCallback((sym: string) => symbols.includes(sym.toUpperCase()), [symbols]);

  return { symbols, add, remove, has };
}
