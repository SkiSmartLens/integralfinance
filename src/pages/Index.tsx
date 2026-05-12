import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Ticker } from "@/components/Ticker";
import { CategoryNav } from "@/components/CategoryNav";
import { StockChart } from "@/components/StockChart";
import { Watchlist } from "@/components/Watchlist";
import { SectorHeatmap } from "@/components/SectorHeatmap";
import { CATEGORIES, TRENDING } from "@/lib/categories";
import { cn } from "@/lib/utils";

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
      <Header onSearch={(s) => setActiveSymbol(s)} />
      <Ticker />
      <CategoryNav
        active={activeCat}
        onChange={setActiveCat}
        activeSub={activeSub}
        onSubChange={setActiveSub}
      />
      <div className="container mx-auto px-4 pt-4">
        <SectorHeatmap onSelect={setActiveSymbol} />
      </div>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-6 min-w-0">
            <StockChart symbol={activeSymbol} />
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
              symbols={watchSymbols}
              active={activeSymbol}
              onSelect={setActiveSymbol}
              title={sub?.label ?? (cat.label === "News" ? "Trending" : cat.label)}
            />
            <Watchlist
              symbols={myWatchlist}
              active={activeSymbol}
              onSelect={setActiveSymbol}
              title="My Watchlist"
            />
            <Watchlist
              symbols={TRENDING}
              active={activeSymbol}
              onSelect={setActiveSymbol}
              title="Most Active"
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
