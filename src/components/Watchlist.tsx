import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { formatNumber } from "@/lib/yahoo";
import { cn } from "@/lib/utils";

interface Props {
  symbols: string[];
  active: string;
  onSelect: (sym: string) => void;
  title?: string;
}

export const Watchlist = ({ symbols, active, onSelect, title = "Watchlist" }: Props) => {
  const { quotes } = useLiveQuotes(symbols, 15000);
  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b font-semibold text-sm uppercase tracking-wide">
        {title}
      </div>
      <div className="divide-y max-h-[520px] overflow-y-auto">
        {symbols.map((sym) => {
          const q = quotes.find((x) => x.symbol === sym);
          const up = (q?.regularMarketChange ?? 0) >= 0;
          return (
            <button
              key={sym}
              onClick={() => onSelect(sym)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted transition-colors",
                active === sym && "bg-accent"
              )}
            >
              <div className="min-w-0">
                <div className="font-semibold text-sm">{sym}</div>
                <div className="text-xs text-muted-foreground truncate max-w-[140px]">
                  {q?.shortName || "—"}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold tabular-nums text-sm">
                  {formatNumber(q?.regularMarketPrice)}
                </div>
                <div className={cn("text-xs tabular-nums", up ? "text-up" : "text-down")}>
                  {up ? "+" : ""}
                  {formatNumber(q?.regularMarketChangePercent)}%
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
