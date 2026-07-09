import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/backend";

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

function save(symbols: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(symbols));
  } catch {
    /* ignore */
  }
}

export function useWatchlist() {
  const [symbols, setSymbols] = useState<string[]>(() => load());
  const [userId, setUserId] = useState<string | null>(null);

  // Track auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserId(s?.user?.id ?? null);
    });
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // When signed in: load from DB, merging any local-only symbols up to the account.
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      const { data } = await supabase.from("watchlist").select("symbol").eq("user_id", userId);
      if (!alive) return;
      const remote = (data ?? []).map((r) => r.symbol.toUpperCase());
      const local = load();
      const toUpload = local.filter((s) => !remote.includes(s));
      if (toUpload.length) {
        await supabase.from("watchlist").upsert(
          toUpload.map((symbol) => ({ user_id: userId, symbol })),
          { onConflict: "user_id,symbol", ignoreDuplicates: true },
        );
      }
      const merged = Array.from(new Set([...remote, ...local]));
      if (alive) {
        setSymbols(merged);
        save(merged);
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  // Keep localStorage in sync (offline cache + guest persistence)
  useEffect(() => { save(symbols); }, [symbols]);

  // Sync across tabs (guest mode)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setSymbols(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const uidRef = useRef(userId);
  uidRef.current = userId;

  const add = useCallback((sym: string) => {
    const s = sym.trim().toUpperCase();
    if (!s) return;
    setSymbols((prev) => (prev.includes(s) ? prev : [...prev, s]));
    const uid = uidRef.current;
    if (uid) {
      supabase.from("watchlist").upsert(
        { user_id: uid, symbol: s },
        { onConflict: "user_id,symbol", ignoreDuplicates: true },
      ).then(({ error }) => { if (error) console.error("watchlist add failed", error); });
    }
  }, []);

  const remove = useCallback((sym: string) => {
    const s = sym.toUpperCase();
    setSymbols((prev) => prev.filter((x) => x !== s));
    const uid = uidRef.current;
    if (uid) {
      supabase.from("watchlist").delete().eq("user_id", uid).eq("symbol", s)
        .then(({ error }) => { if (error) console.error("watchlist remove failed", error); });
    }
  }, []);

  const has = useCallback((sym: string) => symbols.includes(sym.toUpperCase()), [symbols]);

  return { symbols, add, remove, has };
}
