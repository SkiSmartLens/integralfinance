import { useEffect, useRef, useState } from "react";
import { Star, Search, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { fetchSearchQuotes, formatNumber, SearchQuote } from "@/lib/yahoo";
import { cn } from "@/lib/utils";

interface Props {
  onSelect?: (symbol: string) => void;
}

export const WatchlistButton = ({ onSelect }: Props) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const nav = useNavigate();
  const { symbols, add, remove, has } = useWatchlist();
  const { quotes } = useLiveQuotes(open ? symbols : [], 15000);

  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchQuote[]>([]);

  useEffect(() => {
    const term = q.trim();
    if (!term) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetchSearchQuotes(term, 6);
        setResults(r.filter((x) => x.symbol));
      } catch {/* ignore */}
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (sym: string) => {
    setOpen(false);
    setQ("");
    if (onSelect) onSelect(sym);
    else nav(`/?symbol=${sym}`);
  };

  return (
    <div ref={ref} className="ml-auto relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap",
          open ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
        )}
      >
        <Star className="w-4 h-4" />
        Watchlist
        {symbols.length > 0 && (
          <span className="text-[10px] bg-background/80 text-foreground rounded-full px-1.5 py-0.5">
            {symbols.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-popover border rounded-md shadow-lg z-40 max-h-[28rem] overflow-hidden flex flex-col">
          <div className="p-2 border-b relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search to add (Apple, AAPL…)"
              className="w-full pl-8 pr-2 py-2 bg-muted rounded text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {q.trim() && results.length > 0 && (
            <div className="border-b max-h-48 overflow-y-auto">
              {results.map((r) => {
                const inList = has(r.symbol);
                return (
                  <div
                    key={r.symbol}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent/50"
                  >
                    <button
                      onClick={() => pick(r.symbol)}
                      className="text-left min-w-0 flex-1"
                    >
                      <div className="font-semibold">{r.symbol}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.longname || r.shortname || r.typeDisp || ""}
                      </div>
                    </button>
                    <button
                      onClick={() => add(r.symbol)}
                      disabled={inList}
                      className={cn(
                        "p-1.5 rounded-full shrink-0",
                        inList
                          ? "text-muted-foreground"
                          : "bg-primary text-primary-foreground hover:opacity-90"
                      )}
                      aria-label={inList ? "Already in list" : "Add"}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b flex items-center justify-between">
            <span>My Watchlist</span>
            <span>{symbols.length}</span>
          </div>
          <div className="overflow-y-auto flex-1">
            {symbols.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Empty. Search above and tap <Plus className="inline w-3 h-3" /> to add.
              </div>
            ) : (
              <div className="divide-y">
                {symbols.map((sym) => {
                  const quote = quotes.find((x) => x.symbol === sym);
                  const up = (quote?.regularMarketChangePercent ?? 0) >= 0;
                  return (
                    <div key={sym} className="flex items-center px-3 py-2 hover:bg-accent/40">
                      <button onClick={() => pick(sym)} className="text-left min-w-0 flex-1">
                        <div className="font-semibold text-sm">{sym}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {quote?.shortName || "—"}
                        </div>
                      </button>
                      <div className="text-right mr-2">
                        <div className="font-semibold tabular-nums text-sm">
                          {formatNumber(quote?.regularMarketPrice)}
                        </div>
                        <div className={cn("text-xs tabular-nums", up ? "text-up" : "text-down")}>
                          {up ? "+" : ""}{formatNumber(quote?.regularMarketChangePercent)}%
                        </div>
                      </div>
                      <button
                        onClick={() => remove(sym)}
                        className="p-1 rounded text-muted-foreground hover:text-down hover:bg-muted shrink-0"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
