import { useEffect, useState } from "react";
import { Plus, Search, Star, Trash2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Ticker } from "@/components/Ticker";
import { StockChart } from "@/components/StockChart";
import { StockExplainer } from "@/components/StockExplainer";
import { SEO } from "@/components/SEO";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { fetchSearchQuotes, formatNumber, SearchQuote } from "@/lib/yahoo";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const WatchlistPage = () => {
  const { symbols, add, remove, has } = useWatchlist();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchQuote[]>([]);
  const [active, setActive] = useState<string | null>(symbols[0] ?? null);
  const { quotes } = useLiveQuotes(symbols, 15000);

  // Live search-as-you-type
  useEffect(() => {
    const term = q.trim();
    if (!term) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetchSearchQuotes(term, 8);
        setResults(r.filter((x) => x.symbol));
      } catch {/* ignore */}
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  // Keep an active selection
  useEffect(() => {
    if (!active && symbols.length) setActive(symbols[0]);
    if (active && !symbols.includes(active) && symbols.length) setActive(symbols[0]);
    if (!symbols.length) setActive(null);
  }, [symbols, active]);

  const addAndShow = (sym: string) => {
    add(sym);
    setActive(sym.toUpperCase());
    setQ("");
    setResults([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Watchlist — Integral Stocks"
        description="Search any stock and add it to your personal watchlist. Live prices and beginner explanations."
        path="/watchlist"
      />
      <Header onSearch={(s) => addAndShow(s)} />
      <Ticker />

      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <div className="flex items-center gap-3">
          <Star className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">My Watchlist</h1>
          <Link to="/" className="ml-auto text-xs text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
        </div>

        {/* Big search bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search any stock — Apple, AAPL, Tesla, BTC…"
            className="w-full pl-11 pr-4 py-3 bg-card border rounded-lg text-base outline-none focus:ring-2 focus:ring-primary"
          />
          {q.trim() && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-popover border rounded-lg shadow-xl z-20 max-h-80 overflow-y-auto">
              {results.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">Searching…</div>
              ) : (
                results.map((r) => {
                  const inList = has(r.symbol);
                  return (
                    <div
                      key={r.symbol}
                      className="flex items-center justify-between px-4 py-3 hover:bg-accent/50"
                    >
                      <button
                        onClick={() => { setActive(r.symbol); setQ(""); setResults([]); }}
                        className="text-left min-w-0 flex-1"
                      >
                        <div className="font-semibold text-sm">{r.symbol}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {r.longname || r.shortname || r.typeDisp || ""}
                        </div>
                      </button>
                      <button
                        onClick={() => addAndShow(r.symbol)}
                        disabled={inList}
                        className={cn(
                          "ml-3 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0",
                          inList
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary text-primary-foreground hover:opacity-90"
                        )}
                        aria-label={inList ? "Already added" : "Add to watchlist"}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {inList ? "Added" : "Add"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Layout: list of saved + selected stock detail */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <aside className="bg-card border rounded-lg overflow-hidden self-start">
            <div className="px-4 py-3 border-b text-xs font-semibold uppercase tracking-wide flex justify-between">
              <span>Saved</span>
              <span className="text-muted-foreground">{symbols.length}</span>
            </div>
            {symbols.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Empty. Search above and tap <Plus className="inline w-3 h-3" /> to add a stock.
              </div>
            ) : (
              <div className="divide-y max-h-[560px] overflow-y-auto">
                {symbols.map((sym) => {
                  const quote = quotes.find((x) => x.symbol === sym);
                  const up = (quote?.regularMarketChangePercent ?? 0) >= 0;
                  return (
                    <div
                      key={sym}
                      className={cn(
                        "group flex items-center hover:bg-muted/60",
                        active === sym && "bg-accent"
                      )}
                    >
                      <button
                        onClick={() => setActive(sym)}
                        className="flex-1 flex items-center justify-between px-4 py-3 text-left min-w-0"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-sm">{sym}</div>
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
                      <button
                        onClick={() => remove(sym)}
                        className="p-2 mr-1 text-muted-foreground hover:text-down opacity-0 group-hover:opacity-100"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </aside>

          <div className="space-y-6 min-w-0">
            {active ? (
              <>
                <StockChart symbol={active} />
                <StockExplainer symbol={active} />
              </>
            ) : (
              <div className="bg-card border rounded-lg p-12 text-center text-muted-foreground">
                Search for a stock above and hit{" "}
                <Plus className="inline w-4 h-4 align-text-bottom" /> to add it.
                Then it'll show up here with a live chart and a plain-English explainer.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default WatchlistPage;
