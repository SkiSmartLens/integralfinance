import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Ticker } from "@/components/Ticker";
import { CategoryNav } from "@/components/CategoryNav";
import { StockChart } from "@/components/StockChart";
import { NewsList } from "@/components/NewsList";
import { Watchlist } from "@/components/Watchlist";
import { CATEGORIES, TRENDING } from "@/lib/categories";
import { cn } from "@/lib/utils";

const Index = () => {
  const [activeCat, setActiveCat] = useState("news");
  const [activeSymbol, setActiveSymbol] = useState("AAPL");
  const [newsTab, setNewsTab] = useState<"my" | "general">("general");

  const cat = useMemo(
    () => CATEGORIES.find((c) => c.id === activeCat) ?? CATEGORIES[0],
    [activeCat]
  );

  useEffect(() => {
    const first = cat.symbols?.[0] ?? "^GSPC";
    setActiveSymbol(first);
  }, [cat]);

  const watchSymbols = cat.symbols && cat.symbols.length ? cat.symbols : TRENDING;
  const myNewsQuery = watchSymbols.slice(0, 8).join(" OR ");

  return (
    <div className="min-h-screen bg-background">
      <Header onSearch={(s) => setActiveSymbol(s)} />
      <Ticker />
      <CategoryNav active={activeCat} onChange={setActiveCat} />

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-6 min-w-0">
            <StockChart symbol={activeSymbol} />
            <section>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-2xl font-bold">
                  {newsTab === "my" ? "My News" : cat.label}{" "}
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
              <NewsList
                key={newsTab + ":" + (newsTab === "my" ? myNewsQuery : cat.query)}
                query={newsTab === "my" ? myNewsQuery : cat.query}
              />
            </section>
          </div>
          <aside className="space-y-6">
            <Watchlist
              symbols={watchSymbols}
              active={activeSymbol}
              onSelect={setActiveSymbol}
              title={cat.label === "News" ? "Trending" : cat.label}
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
