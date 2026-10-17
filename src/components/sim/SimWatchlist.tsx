import { Link } from "react-router-dom";
import { ArrowRight, Star, X } from "lucide-react";
import { MarketBriefCard } from "@/components/MarketBriefCard";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { formatNumber } from "@/lib/yahoo";
import { cn } from "@/lib/utils";

/**
 * The player's saved watchlist (the same one as /watchlist), with the Daily
 * Market Brief pinned at the top. Tapping a stock, or a top mover in the
 * brief, opens it for trading.
 */
export const SimWatchlist = ({ selected, onSelect }: { selected: string; onSelect: (symbol: string) => void }) => {
  const { symbols, add, remove, has } = useWatchlist();
  const { quotes } = useLiveQuotes(symbols, 15000);
  const watching = has(selected);

  return (
    <div className="rounded-3xl border-2 bg-card shadow-sm overflow-hidden">
      <MarketBriefCard onSymbol={onSelect} className="border-b" />

      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <Star className="w-4 h-4 text-primary" />
        <h3 className="font-bold">Your watchlist</h3>
        {symbols.length > 0 && <span className="text-xs text-muted-foreground">{symbols.length}</span>}
        <button
          type="button"
          onClick={() => (watching ? remove(selected) : add(selected))}
          className={cn(
            "ml-auto h-8 px-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 border-2 transition-colors",
            watching ? "border-primary/40 text-primary" : "hover:border-primary",
          )}
          title={watching ? `Remove ${selected} from your watchlist` : `Add ${selected} to your watchlist`}
        >
          <Star className={cn("w-3.5 h-3.5", watching && "fill-current")} />
          {watching ? "Watching" : "Add"} {selected}
        </button>
      </div>

      {symbols.length === 0 ? (
        <p className="px-4 py-5 text-center text-xs text-muted-foreground">
          Nothing saved yet. Tap <span className="font-semibold">Add {selected}</span> to follow a stock here.
        </p>
      ) : (
        <div className="divide-y max-h-[360px] overflow-y-auto">
          {symbols.map((sym) => {
            const q = quotes.find((x) => x.symbol === sym);
            const pct = q?.regularMarketChangePercent;
            return (
              <div key={sym} className={cn("group flex items-center hover:bg-muted/60", selected === sym && "bg-accent")}>
                <button
                  type="button"
                  onClick={() => onSelect(sym)}
                  className="flex-1 flex items-center justify-between gap-3 px-4 py-2.5 text-left min-w-0"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">{sym}</div>
                    <div className="text-xs text-muted-foreground truncate">{q?.shortName || "—"}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold tabular-nums text-sm">{formatNumber(q?.regularMarketPrice)}</div>
                    <div className={cn("text-xs tabular-nums", (pct ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {pct == null ? "—" : `${pct >= 0 ? "+" : ""}${formatNumber(pct)}%`}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => remove(sym)}
                  className="p-2 mr-1 min-w-11 min-h-11 flex items-center justify-center text-muted-foreground hover:text-rose-600 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                  aria-label={`Remove ${sym} from your watchlist`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Link
        to="/watchlist"
        className="flex items-center gap-1 px-4 py-2.5 border-t text-xs font-bold text-muted-foreground hover:text-foreground"
      >
        Open full watchlist <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
};
