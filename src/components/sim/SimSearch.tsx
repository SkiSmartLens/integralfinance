import { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { fetchSearchQuotes, fetchQuotes, formatNumber, SearchQuote } from "@/lib/yahoo";
import { cn } from "@/lib/utils";

interface Row extends SearchQuote {
  price?: number;
  changePct?: number;
}

export const SimSearch = ({ onSelect }: { onSelect: (symbol: string) => void }) => {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Debounced search + live prices.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setRows([]);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const results = (await fetchSearchQuotes(q, 8)).filter(
          (r) => r.quoteType === "EQUITY" || r.quoteType === "ETF" || !r.quoteType
        );
        if (!alive) return;
        setRows(results);
        setActive(0);
        setOpen(true);
        // Enrich with live price + daily change.
        const syms = results.map((r) => r.symbol).filter(Boolean);
        if (syms.length) {
          const quotes = await fetchQuotes(syms);
          if (!alive) return;
          const map = new Map(quotes.map((qt) => [qt.symbol, qt]));
          setRows((prev) =>
            prev.map((r) => {
              const qt = map.get(r.symbol);
              return { ...r, price: qt?.regularMarketPrice, changePct: qt?.regularMarketChangePercent };
            })
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(handle);
    };
  }, [query]);

  const choose = (symbol: string) => {
    onSelect(symbol.toUpperCase());
    setQuery("");
    setRows([]);
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open || !rows.length) {
      if (e.key === "Enter" && query.trim()) choose(query.trim());
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(rows.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(rows[active]?.symbol ?? query.trim());
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => rows.length && setOpen(true)}
          onKeyDown={onKey}
          placeholder="Search a stock or ticker…"
          className="w-full h-11 pl-10 pr-10 rounded-xl bg-muted/60 border border-transparent focus:border-primary/40 focus:bg-card outline-none text-sm transition-colors"
        />
        {loading && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />}
      </div>

      {open && rows.length > 0 && (
        <div className="absolute z-30 mt-2 w-full rounded-xl border bg-card shadow-lg overflow-hidden animate-fade-in">
          <ul className="max-h-80 overflow-y-auto py-1">
            {rows.map((r, i) => {
              const up = (r.changePct ?? 0) >= 0;
              return (
                <li key={r.symbol}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(r.symbol)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors",
                      i === active ? "bg-accent/60" : "hover:bg-muted/60"
                    )}
                  >
                    <span className="w-16 shrink-0 font-bold text-sm">{r.symbol}</span>
                    <span className="flex-1 min-w-0 text-xs text-muted-foreground truncate">
                      {r.shortname || r.longname || r.exchDisp}
                    </span>
                    {r.price != null && (
                      <span className="text-right tabular-nums">
                        <span className="block text-sm font-semibold">${formatNumber(r.price)}</span>
                        {r.changePct != null && (
                          <span className={cn("block text-[11px] font-semibold", up ? "text-up" : "text-down")}>
                            {up ? "+" : ""}
                            {formatNumber(r.changePct)}%
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
