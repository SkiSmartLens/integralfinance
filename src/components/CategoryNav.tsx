import { CATEGORIES, TRENDING } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { LineChart, Filter, Star, Calendar } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { formatNumber } from "@/lib/yahoo";

interface Props {
  active: string;
  onChange: (id: string) => void;
  activeSub?: string;
  onSubChange?: (subId: string | undefined) => void;
}

export const CategoryNav = ({ active, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const nav = useNavigate();
  const { quotes } = useLiveQuotes(open ? TRENDING : [], 15000);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="border-b bg-background sticky top-0 z-30">
      <div className="container mx-auto px-4">
        <div className="flex gap-1 overflow-x-auto no-scrollbar py-2 items-center">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => onChange(c.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                active === c.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {c.label}
            </button>
          ))}
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
            </button>
            {open && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-popover border rounded-md shadow-lg z-40 max-h-96 overflow-y-auto">
                <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b">
                  Trending
                </div>
                <div className="divide-y">
                  {TRENDING.map((sym) => {
                    const quote = quotes.find((x) => x.symbol === sym);
                    const up = (quote?.regularMarketChangePercent ?? 0) >= 0;
                    return (
                      <button
                        key={sym}
                        onClick={() => {
                          setOpen(false);
                          nav(`/?symbol=${sym}`);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold">{sym}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[140px]">
                            {quote?.shortName || "—"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold tabular-nums text-sm">
                            {formatNumber(quote?.regularMarketPrice)}
                          </div>
                          <div className={cn("text-xs tabular-nums", up ? "text-up" : "text-down")}>
                            {up ? "+" : ""}{formatNumber(quote?.regularMarketChangePercent)}%
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <Link
            to="/screener"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-muted hover:bg-muted/70"
          >
            <Filter className="w-4 h-4" />
            Screener
          </Link>
          <Link
            to="/sim"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-primary text-primary-foreground hover:opacity-90"
          >
            <LineChart className="w-4 h-4" />
            Simulator
          </Link>
        </div>
      </div>
    </div>
  );
};
