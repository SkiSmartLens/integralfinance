import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { INDEX_TICKERS } from "@/lib/categories";
import { formatNumber } from "@/lib/yahoo";

const LABELS: Record<string, string> = {
  "^GSPC": "S&P 500",
  "^DJI": "Dow 30",
  "^IXIC": "Nasdaq",
  "^RUT": "Russell 2K",
  "^VIX": "VIX",
  "CL=F": "Crude Oil",
  "GC=F": "Gold",
  "BTC-USD": "Bitcoin",
  "ETH-USD": "Ethereum",
  "EURUSD=X": "EUR/USD",
  "^FTSE": "FTSE 100",
  "^N225": "Nikkei 225",
};

export const Ticker = () => {
  const { quotes } = useLiveQuotes(INDEX_TICKERS, 20000);
  if (!quotes.length) {
    return <div className="h-10 border-y bg-card" />;
  }
  const items = [...quotes, ...quotes];
  return (
    <div className="border-y bg-card overflow-hidden">
      <div className="flex ticker-scroll whitespace-nowrap py-2">
        {items.map((q, i) => {
          const up = (q.regularMarketChange ?? 0) >= 0;
          return (
            <div key={i} className="flex items-center gap-2 px-6 text-sm">
              <span className="font-semibold">{LABELS[q.symbol] || q.symbol}</span>
              <span className="text-foreground">{formatNumber(q.regularMarketPrice)}</span>
              <span className={up ? "text-up" : "text-down"}>
                {up ? "▲" : "▼"} {formatNumber(q.regularMarketChange)} (
                {formatNumber(q.regularMarketChangePercent)}%)
              </span>
              <span className="text-border">|</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
