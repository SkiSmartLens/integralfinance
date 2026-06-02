import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchScreener, formatNumber, ScreenerQuote } from "@/lib/yahoo";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { INDEX_TICKERS, SECTORS, TRENDING } from "@/lib/categories";
import { useWatchlist } from "@/hooks/useWatchlist";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  "^GSPC": "S&P 500", "^DJI": "Dow 30", "^IXIC": "Nasdaq", "^RUT": "Russell 2K",
  "^VIX": "VIX", "CL=F": "Crude", "GC=F": "Gold", "BTC-USD": "BTC",
  "ETH-USD": "ETH", "EURUSD=X": "EUR/USD", "^FTSE": "FTSE", "^N225": "Nikkei",
};

function PickRow({ sym, symbol, name, price, pct }: {
  sym: string; symbol: string; name?: string; price?: number; pct?: number;
}) {
  const up = (pct ?? 0) >= 0;
  return (
    <Link
      to={`/stocks/${symbol.toLowerCase()}`}
      className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/60 transition-colors text-left"
    >
      <span className="min-w-0">
        <span className="font-bold text-sm">{sym}</span>
        {name && <span className="block text-[10px] text-muted-foreground truncate">{name}</span>}
      </span>
      <span className="flex items-center gap-2 shrink-0 tabular-nums">
        <span className="text-sm">{price != null ? formatNumber(price) : "—"}</span>
        <span className={cn("text-xs font-bold w-14 text-right", up ? "text-up" : "text-down")}>
          {pct != null ? `${up ? "+" : ""}${pct.toFixed(2)}%` : "—"}
        </span>
      </span>
    </Link>
  );
}

function useScreener(scrId: string) {
  const [items, setItems] = useState<ScreenerQuote[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => fetchScreener(scrId, 8).then((r) => { if (alive) setItems(r.slice(0, 6)); }).catch(() => {});
    load();
    const t = window.setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, [scrId]);
  return items;
}

function ScreenerList({ scrId }: { scrId: string }) {
  const items = useScreener(scrId);
  if (!items.length) return <div className="p-4 text-xs text-muted-foreground">Loading…</div>;
  return (
    <ul className="divide-y">
      {items.map((q) => (
        <PickRow
          key={q.symbol}
          sym={q.symbol}
          symbol={q.symbol}
          name={q.shortName ?? q.longName}
          price={q.regularMarketPrice}
          pct={q.regularMarketChangePercent}
        />
      ))}
    </ul>
  );
}

function QuoteList({ symbols, labelMap }: { symbols: string[]; labelMap?: Record<string, string> }) {
  const { quotes } = useLiveQuotes(symbols);
  const map = Object.fromEntries(quotes.map((q) => [q.symbol, q]));
  return (
    <ul className="divide-y">
      {symbols.slice(0, 8).map((s) => {
        const q = map[s];
        return (
          <PickRow
            key={s}
            sym={labelMap?.[s] ?? s}
            symbol={s}
            price={q?.regularMarketPrice}
            pct={q?.regularMarketChangePercent}
          />
        );
      })}
    </ul>
  );
}

export function TopGainersWidget() { return <ScreenerList scrId="day_gainers" />; }
export function TopLosersWidget() { return <ScreenerList scrId="day_losers" />; }
export function MostActiveWidget() { return <ScreenerList scrId="most_actives" />; }
export function TrendingWidget() { return <QuoteList symbols={TRENDING.slice(0, 8)} />; }
export function IndicesWidget() { return <QuoteList symbols={INDEX_TICKERS.slice(0, 8)} labelMap={LABELS} />; }

export function SectorsWidget() {
  const symbols = SECTORS.map((s) => s.symbol);
  const { quotes } = useLiveQuotes(symbols, 30000);
  const map = Object.fromEntries(quotes.map((q) => [q.symbol, q]));
  return (
    <div className="grid grid-cols-2 gap-1.5 p-2">
      {SECTORS.map((s) => {
        const pct = map[s.symbol]?.regularMarketChangePercent;
        const a = pct == null ? 0.15 : Math.max(0.18, Math.min(0.95, Math.abs(pct) / 3));
        const hue = (pct ?? 0) >= 0 ? "var(--chart-up)" : "var(--chart-down)";
        return (
          <Link
            key={s.symbol}
            to={`/stocks/${s.symbol.toLowerCase()}`}
            style={{ background: `hsl(${hue} / ${a})` }}
            className="rounded p-2 text-left hover:scale-[1.02] transition-transform"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">{s.symbol}</div>
            <div className="text-xs font-bold leading-tight truncate">{s.name}</div>
            <div className="text-xs font-bold tabular-nums mt-0.5">
              {pct == null ? "—" : `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function MyWatchlistWidget() {
  const { symbols } = useWatchlist();
  if (!symbols.length) {
    return (
      <div className="p-4 text-xs text-muted-foreground">
        No tickers yet. Add some from any stock page, or ask Integral AI to add one for you.
      </div>
    );
  }
  return <QuoteList symbols={symbols} />;
}
