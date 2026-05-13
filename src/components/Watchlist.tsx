import { useEffect, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { useWatchlist } from "@/hooks/useWatchlist";
import { fetchSearchQuotes, formatNumber, SearchQuote } from "@/lib/yahoo";
import { cn } from "@/lib/utils";

interface Props {
  symbols: string[];
  active: string;
  onSelect: (sym: string) => void;
  title?: string;
  /** When true, show inline search + plus add controls (saves to user's watchlist). */
  addable?: boolean;
}

/** Brief background flash when the value changes (Yahoo-style price tick). */
const useFlash = (value: number | undefined) => {
  const prev = useRef<number | undefined>(value);
  const [dir, setDir] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    if (value == null || prev.current == null) {
      prev.current = value;
      return;
    }
    if (value > prev.current) setDir("up");
    else if (value < prev.current) setDir("down");
    prev.current = value;
    if (dir !== null) {
      const t = setTimeout(() => setDir(null), 700);
      return () => clearTimeout(t);
    }
  }, [value]); // eslint-disable-line
  return dir;
};

const Row = ({
  sym, q, active, onClick, onRemove,
}: {
  sym: string;
  q: any;
  active: boolean;
  onClick: () => void;
  onRemove?: () => void;
}) => {
  const flash = useFlash(q?.regularMarketPrice);
  const up = (q?.regularMarketChange ?? 0) >= 0;
  return (
    <div className={cn("group flex items-center hover:bg-muted/60", active && "bg-accent")}>
      <button onClick={onClick} className="flex-1 flex items-center justify-between px-4 py-3 text-left min-w-0">
        <div className="min-w-0">
          <div className="font-semibold text-sm">{sym}</div>
          <div className="text-xs text-muted-foreground truncate max-w-[140px]">
            {q?.shortName || "—"}
          </div>
        </div>
        <div className="text-right">
          <div className={cn(
            "font-semibold tabular-nums text-sm rounded px-1.5 -mr-1.5 transition-colors",
            flash === "up" && "bg-up/20 text-up",
            flash === "down" && "bg-down/20 text-down",
          )}>
            {formatNumber(q?.regularMarketPrice)}
          </div>
          <div className={cn("text-xs tabular-nums", up ? "text-up" : "text-down")}>
            {up ? "+" : ""}{formatNumber(q?.regularMarketChangePercent)}%
          </div>
        </div>
      </button>
      {onRemove && (
        <button
          onClick={onRemove}
          className="p-2 mr-1 text-muted-foreground hover:text-down opacity-0 group-hover:opacity-100"
          aria-label="Remove"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export const Watchlist = ({ symbols, active, onSelect, title = "Watchlist", addable }: Props) => {
  const { quotes } = useLiveQuotes(symbols, 15000);
  const { add, remove } = useWatchlist();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchQuote[]>([]);

  useEffect(() => {
    if (!addable) return;
    const term = q.trim();
    if (!term) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetchSearchQuotes(term, 6);
        setResults(r.filter((x) => x.symbol));
      } catch {/* ignore */}
    }, 200);
    return () => clearTimeout(t);
  }, [q, addable]);

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b font-semibold text-sm uppercase tracking-wide">
        {title}
      </div>

      {addable && (
        <div className="p-2 border-b relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search to add (AAPL, Tesla…)"
            className="w-full pl-8 pr-2 py-2 bg-muted rounded text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          {q.trim() && results.length > 0 && (
            <div className="absolute left-2 right-2 top-full mt-1 bg-popover border rounded-md shadow-lg z-10 max-h-64 overflow-y-auto">
              {results.map((r) => {
                const inList = symbols.includes(r.symbol);
                return (
                  <div key={r.symbol} className="flex items-center justify-between px-3 py-2 text-sm hover:bg-accent/50">
                    <button onClick={() => { onSelect(r.symbol); setQ(""); }} className="text-left min-w-0 flex-1">
                      <div className="font-semibold">{r.symbol}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.longname || r.shortname || r.typeDisp || ""}
                      </div>
                    </button>
                    <button
                      onClick={() => { add(r.symbol); setQ(""); }}
                      disabled={inList}
                      className={cn(
                        "p-1.5 rounded-full shrink-0 ml-2",
                        inList ? "text-muted-foreground" : "bg-primary text-primary-foreground hover:opacity-90"
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
        </div>
      )}

      <div className="divide-y max-h-[520px] overflow-y-auto">
        {symbols.length === 0 && addable ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Empty. Search above and tap <Plus className="inline w-3 h-3" /> to add.
          </div>
        ) : (
          symbols.map((sym) => (
            <Row
              key={sym}
              sym={sym}
              q={quotes.find((x) => x.symbol === sym)}
              active={active === sym}
              onClick={() => onSelect(sym)}
              onRemove={addable ? () => remove(sym) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
};
