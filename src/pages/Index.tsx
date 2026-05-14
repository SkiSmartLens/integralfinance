import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Ticker } from "@/components/Ticker";
import { CategoryNav } from "@/components/CategoryNav";
import { StockChart } from "@/components/StockChart";
import { Watchlist } from "@/components/Watchlist";
import { StockExplainer } from "@/components/StockExplainer";
import { SEO } from "@/components/SEO";
import { useWatchlist } from "@/hooks/useWatchlist";
import { CATEGORIES, TRENDING } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { GraduationCap } from "lucide-react";

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
  const { symbols: myWatchlist } = useWatchlist();

  const cat = useMemo(
    () => CATEGORIES.find((c) => c.id === activeCat) ?? CATEGORIES[0],
    [activeCat]
  );
  const sub = useMemo(
    () => cat.subTopics?.find((s) => s.id === activeSub),
    [cat, activeSub]
  );

  // Reset sub-topic when category changes.
  useEffect(() => {
    setActiveSub(undefined);
  }, [activeCat]);

  // Pick first symbol when category or sub-topic changes.
  useEffect(() => {
    const first = (sub?.symbols ?? cat.symbols)?.[0] ?? "^GSPC";
    setActiveSymbol(first);
  }, [cat, sub]);

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
      <main className="container mx-auto px-4 py-8 space-y-8 max-w-6xl">
        {/* Beginner welcome banner — minimalist single sentence */}
        <div className="flex items-start gap-3 bg-accent/40 border border-accent rounded-lg p-4 text-sm">
          <GraduationCap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-semibold">New to investing?</span>{" "}
            Pick any stock to see a plain-English explanation, the price, and what's happening today.
            Hover any underlined term for a definition.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
          <div className="space-y-6 min-w-0">
            <StockChart symbol={activeSymbol} />
            <StockExplainer symbol={activeSymbol} />
            <Suspense fallback={<div className="h-32" />}>
              <StockSummary symbol={activeSymbol} />
            </Suspense>
            <section>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-2xl font-bold">
                  {newsTab === "my" ? "My News" : (sub?.label ?? cat.label)}{" "}
                  <span className="text-muted-foreground font-normal text-base">
                    · latest stories
                  </span>
                </h2>
                <div className="flex gap-1 bg-muted rounded-md p-1">
                  {(["my", "general"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setNewsTab(t)}
                      className={cn(
                        "px-3 py-1.5 rounded text-xs font-semibold transition-colors",
                        newsTab === t
                          ? "bg-background shadow-sm"
                          : "text-muted-foreground"
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
              symbols={myWatchlist}
              active={activeSymbol}
              onSelect={setActiveSymbol}
              title="My Watchlist"
              addable
            />
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
        Live data via Yahoo Finance public endpoints. Prices may be delayed. Not investment advice.
      </footer>
    </div>
  );
};

export default Index;
