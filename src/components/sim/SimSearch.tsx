import { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { fetchSearchQuotes, fetchQuotes, formatNumber, SearchQuote } from "@/lib/yahoo";
import { cn } from "@/lib/utils";

interface Row extends SearchQuote {
  price?: number;
  changePct?: number;
}

// One-tap picks for players who don't know a ticker yet.
const POPULAR = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "NVDA", name: "Nvidia" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "GOOGL", name: "Google" },
  { symbol: "SPY", name: "S&P 500 fund" },
];

const STEPS = ["Search for a company", "Choose how many shares", "Press the green Buy button"];

/**
 * The simulator's stock search: the first thing on the page, in a
 * highlighted panel, with popular picks. New players also get the three
 * steps to a first trade.
 */
export const SimSearch = ({
  onSelect,
  selected,
  newPlayer = false,
}: {
  onSelect: (symbol: string) => void;
  /** The stock shown below, highlighted among the popular picks. */
  selected?: string;
  /** No trades yet: show how to make one. */
  newPlayer?: boolean;
}) => {
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
    <div ref={boxRef} className="relative rounded-3xl border-2 border-primary/30 bg-primary/5 p-4 sm:p-5">
      {newPlayer && (
        <ol className="grid sm:grid-cols-3 gap-2 mb-4">
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-center gap-2 rounded-xl bg-card border px-3 py-2 text-xs font-semibold">
              <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-extrabold flex items-center justify-center">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      )}
      <label htmlFor="sim-search" className="flex items-center gap-2 text-base font-extrabold mb-2">
        Find a stock to trade
      </label>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary pointer-events-none" />
        <input
          id="sim-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => rows.length && setOpen(true)}
          onKeyDown={onKey}
          placeholder="Company name or ticker"
          autoComplete="off"
          className="w-full h-14 pl-12 pr-12 rounded-2xl bg-card border-2 border-primary/60 shadow-sm text-base font-semibold placeholder:font-normal placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-shadow"
        />
        {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />}
        {open && rows.length > 0 && (
          <div className="absolute z-30 left-0 right-0 top-full mt-2 rounded-xl border bg-card shadow-lg overflow-hidden animate-fade-in">
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
      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        <span className="text-xs font-bold text-muted-foreground mr-1">Popular:</span>
        {POPULAR.map((p) => (
          <button
            key={p.symbol}
            type="button"
            onClick={() => choose(p.symbol)}
            title={p.symbol}
            className={cn(
              "px-2.5 py-1 rounded-full border text-xs font-bold transition-colors",
              selected === p.symbol
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card hover:border-primary/60 hover:text-primary",
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

    </div>
  );
};
