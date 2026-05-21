import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Ticker } from "@/components/Ticker";
import { CategoryNav } from "@/components/CategoryNav";
import { StockChart } from "@/components/StockChart";
import { Watchlist } from "@/components/Watchlist";
import { StockExplainer } from "@/components/StockExplainer";
import { SEO } from "@/components/SEO";
import { SidePanel } from "@/components/SidePanel";
import { WidgetBar } from "@/components/WidgetBar";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { useFlash } from "@/hooks/useFlash";
import { CATEGORIES, TRENDING } from "@/lib/categories";
import { formatNumber } from "@/lib/yahoo";
import { cn } from "@/lib/utils";
import { onAction } from "@/lib/actions";
import { useWidgets } from "@/lib/widgets";
import { GraduationCap, TrendingUp, Briefcase } from "lucide-react";

const StockSummary = lazy(() =>
  import("@/components/StockSummary").then((m) => ({ default: m.StockSummary }))
);
const NewsList = lazy(() =>
  import("@/components/NewsList").then((m) => ({ default: m.NewsList }))
);

const Index = () => {
  const [activeCat, setActiveCat] = useState("news");
  const [activeSub, setActiveSub] = useState<string | undefined>(undefined);
  const [activeSymbol, setActiveSymbol] = useState("AAPL");
  const [newsTab, setNewsTab] = useState<"my" | "general">("general");
  const { symbols: myWatchlist, add: addWatch, remove: removeWatch } = useWatchlist();
  const { add: addWidget, remove: removeWidget, reorder: reorderWidgets, reset: resetWidgets } = useWidgets();

  const cat = useMemo(
    () => CATEGORIES.find((c) => c.id === activeCat) ?? CATEGORIES[0],
    [activeCat]
  );
  const sub = useMemo(
    () => cat.subTopics?.find((s) => s.id === activeSub),
    [cat, activeSub]
  );

  useEffect(() => { setActiveSub(undefined); }, [activeCat]);

  useEffect(() => {
    const first = (sub?.symbols ?? cat.symbols)?.[0] ?? "^GSPC";
    setActiveSymbol(first);
  }, [cat, sub]);

  // Listen to AI-driven actions
  useEffect(() => onAction((a) => {
    switch (a.type) {
      case "setCategory":
        if (CATEGORIES.some((c) => c.id === a.id)) {
          setActiveCat(a.id);
          if (a.sub) setTimeout(() => setActiveSub(a.sub), 0);
        }
        break;
      case "selectSymbol":
        if (a.symbol) setActiveSymbol(a.symbol.toUpperCase());
        break;
      case "addWidget": addWidget(a.id); break;
      case "removeWidget": removeWidget(a.id); break;
      case "reorderWidgets": reorderWidgets(a.order); break;
      case "resetWidgets": resetWidgets(); break;
      case "addToWatchlist": if (a.symbol) addWatch(a.symbol); break;
      case "removeFromWatchlist": if (a.symbol) removeWatch(a.symbol); break;
      case "scrollTo": {
        const el = document.getElementById(a.target);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      }
    }
  }), [addWidget, removeWidget, reorderWidgets, resetWidgets, addWatch, removeWatch]);

  const watchSymbols = (sub?.symbols ?? cat.symbols ?? TRENDING);
  const newsQuery = sub?.query ?? cat.query;
  const myNewsQuery = (watchSymbols ?? TRENDING).slice(0, 8).join(" OR ");

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Integral Stocks — Live Markets, News & Trading Sim"
        description="Real-time stock quotes, interactive charts, financial news, sector heatmaps, an economic calendar, and a multiplayer paper-trading simulator."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Integral Stocks",
          description: "Real-time markets dashboard with live quotes, news and trading simulator.",
          url: "https://integralstocks.lovable.app/",
        }}
      />
      <h1 className="sr-only">Integral Stocks — Real-time market dashboard</h1>
      <Header onSearch={(s) => setActiveSymbol(s)} />
      <Ticker />
      <CategoryNav
        active={activeCat}
        onChange={setActiveCat}
        activeSub={activeSub}
        onSubChange={setActiveSub}
      />
      <main className="container mx-auto px-4 py-6 space-y-8 max-w-6xl">
        {activeCat === "news" && (
          <>
            <div id="widgets">
              <WidgetBar />
            </div>

            <div className="flex items-start gap-3 bg-accent/40 border border-accent rounded-lg p-4 text-sm">
              <GraduationCap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <span className="font-semibold">New?</span>{" "}
                Pick any stock for a plain-English explainer, or tap the ✨ sparkle in the corner — Integral AI can take you anywhere and customize the dashboard for you.
              </p>
            </div>
          </>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
          <div className="space-y-6 min-w-0">
            {activeCat !== "news" && (
              <div id="widgets"><WidgetBar /></div>
            )}
            <div id="chart"><StockChart symbol={activeSymbol} /></div>
            <div id="summary"><StockExplainer symbol={activeSymbol} /></div>
            <Suspense fallback={<div className="h-32" />}>
              <StockSummary symbol={activeSymbol} />
            </Suspense>
            <section id="news">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-2xl font-bold">
                  {newsTab === "my" ? "My News" : (sub?.label ?? cat.label)}{" "}
                  <span className="text-muted-foreground font-normal text-base">· latest stories</span>
                </h2>
                <div className="flex gap-1 bg-muted rounded-md p-1">
                  {(["my", "general"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setNewsTab(t)}
                      className={cn(
                        "px-3 py-1.5 rounded text-xs font-semibold transition-colors",
                        newsTab === t ? "bg-background shadow-sm" : "text-muted-foreground"
                      )}
                    >
                      {t === "my" ? "My News" : "General"}
                    </button>
                  ))}
                </div>
              </div>
              <Suspense fallback={<div className="text-muted-foreground py-8 text-center">Loading stories…</div>}>
                <NewsList
                  key={newsTab + ":" + (newsTab === "my" ? myNewsQuery : newsQuery)}
                  query={newsTab === "my" ? myNewsQuery : newsQuery}
                />
              </Suspense>
            </section>
          </div>
          <aside className="space-y-6">
            <Watchlist
              symbols={watchSymbols}
              active={activeSymbol}
              onSelect={setActiveSymbol}
              title={sub?.label ?? (cat.label === "News" ? "Popular Stocks" : cat.label)}
            />
          </aside>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground mt-8">
        Live data via Yahoo Finance public endpoints. Prices may be delayed.
      </footer>


    </div>
  );
};

const HomeSidePanel = ({
  myWatchlist, onPick,
}: { myWatchlist: string[]; onPick: (s: string) => void }) => {
  const syms = myWatchlist.length ? myWatchlist : TRENDING.slice(0, 6);
  const { quotes } = useLiveQuotes(syms);
  const qMap = useMemo(() => Object.fromEntries(quotes.map((q) => [q.symbol, q])), [quotes]);
  return (
    <SidePanel title="Integral Stocks">
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Link to="/watchlist" className="flex flex-col items-center gap-1 py-3 rounded-lg bg-muted hover:bg-accent transition-colors">
            <Briefcase className="w-4 h-4" />
            <span className="text-xs font-semibold">Watchlist</span>
          </Link>
          <Link to="/screener" className="flex flex-col items-center gap-1 py-3 rounded-lg bg-muted hover:bg-accent transition-colors">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-semibold">Screener</span>
          </Link>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold mb-2">
            {myWatchlist.length ? "My Watchlist" : "Trending"}
          </div>
          <ul className="divide-y border rounded-lg overflow-hidden">
            {syms.map((s) => {
              const q = qMap[s];
              return (
                <SheetRow key={s} sym={s} price={q?.regularMarketPrice} chgPct={q?.regularMarketChangePercent} onClick={() => onPick(s)} />
              );
            })}
          </ul>
        </div>
      </div>
    </SidePanel>
  );
};

const SheetRow = ({
  sym, price, chgPct, onClick,
}: { sym: string; price?: number; chgPct?: number; onClick: () => void }) => {
  const flash = useFlash(price);
  const up = (chgPct ?? 0) >= 0;
  return (
    <li>
      <button onClick={onClick} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/60 transition-colors">
        <span className="font-bold text-sm tabular-nums">{sym}</span>
        <span className="flex items-center gap-3">
          <span className={cn(
            "tabular-nums text-sm font-semibold transition-colors duration-300",
            flash === "up" && "text-up", flash === "down" && "text-down",
          )}>
            {price != null ? formatNumber(price) : "—"}
          </span>
          <span className={cn("text-xs tabular-nums font-semibold w-16 text-right", up ? "text-up" : "text-down")}>
            {chgPct != null ? `${up ? "+" : ""}${chgPct.toFixed(2)}%` : "—"}
          </span>
        </span>
      </button>
    </li>
  );
};

export default Index;
