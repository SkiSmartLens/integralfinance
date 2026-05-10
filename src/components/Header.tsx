import { Search, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchSearchQuotes, SearchQuote } from "@/lib/yahoo";
import { cn } from "@/lib/utils";

interface Props {
  onSearch?: (sym: string) => void;
}

export const Header = ({ onSearch }: Props) => {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchQuote[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const nav = useNavigate();
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced autocomplete
  useEffect(() => {
    const term = q.trim();
    if (!term) { setResults([]); return; }
    const handle = setTimeout(async () => {
      try {
        const r = await fetchSearchQuotes(term, 8);
        setResults(r.filter((x) => x.symbol));
        setHighlight(0);
      } catch { /* ignore */ }
    }, 180);
    return () => clearTimeout(handle);
  }, [q]);

  // Click outside closes
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (sym: string) => {
    const s = sym.toUpperCase();
    setQ("");
    setOpen(false);
    setResults([]);
    if (onSearch) onSearch(s);
    else nav(`/?symbol=${s}`);
  };

  return (
    <header className="bg-card border-b">
      <div className="container mx-auto px-4 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl shrink-0">
          <TrendingUp className="text-primary" />
          <span className="hidden sm:inline">IntegralFinance</span>
        </Link>
        <div ref={boxRef} className="flex-1 max-w-xl relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (open && results[highlight]) return pick(results[highlight].symbol);
              const sym = q.trim().toUpperCase();
              if (sym) pick(sym);
            }}
            className="relative"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (!open || !results.length) return;
                if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, results.length - 1)); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
                else if (e.key === "Escape") setOpen(false);
              }}
              placeholder="Search symbols or companies (Apple, AAPL, BTC)…"
              className="w-full pl-9 pr-4 py-2 bg-muted border border-transparent focus:border-primary focus:bg-background rounded-md text-sm outline-none transition-all"
            />
          </form>
          {open && results.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
              {results.map((r, i) => (
                <button
                  key={`${r.symbol}-${i}`}
                  onMouseDown={(e) => { e.preventDefault(); pick(r.symbol); }}
                  onMouseEnter={() => setHighlight(i)}
                  className={cn(
                    "w-full text-left px-3 py-2 flex items-center justify-between gap-3 text-sm",
                    i === highlight ? "bg-accent" : "hover:bg-accent/60"
                  )}
                >
                  <div className="min-w-0">
                    <div className="font-semibold">{r.symbol}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.longname || r.shortname || r.typeDisp || ""}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {r.exchDisp || r.quoteType || ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
