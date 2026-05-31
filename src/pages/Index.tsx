import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Ticker } from "@/components/Ticker";
import { CategoryNav } from "@/components/CategoryNav";
import { StockChart } from "@/components/StockChart";
import { StockExplainer } from "@/components/StockExplainer";
import { SEO } from "@/components/SEO";
import { SidePanel } from "@/components/SidePanel";
import { SiteFooter } from "@/components/SiteFooter";
import { HomeHero, SimulatorCallout, SocialProof } from "@/components/HomeSections";
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
import heroImage from "@/assets/stocks-hero.jpg";

const StockSummary = lazy(() =>
  import("@/components/StockSummary").then((m) => ({ default: m.StockSummary }))
);
const NewsList = lazy(() =>
  import("@/components/NewsList").then((m) => ({ default: m.NewsList }))
);

const Index = () => {
  const location = useLocation();
  const isNewsRoute = location.pathname === "/news";
  const isHome = location.pathname === "/";
  const [activeCat, setActiveCat] = useState("news");
  const [activeSub, setActiveSub] = useState<string | undefined>(undefined);
  const [activeSymbol, setActiveSymbol] = useState("^GSPC");
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
        title="IntegralStocks — Beginner Stock Prices, News & AI Insights"
        description="Beginner-friendly stock dashboard: live stock prices, plain-English news, AI insights that explain why stocks move, and a free paper-trading simulator."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "IntegralStocks",
          description: "Beginner-friendly stock dashboard with live prices, news, and AI insights that explain why stocks move.",
          url: "https://integralstocks.com/",
        }}
      />
      <h1 className="sr-only">IntegralStocks — Beginner-friendly stock prices, news, and AI insights</h1>
      <Header onSearch={(s) => setActiveSymbol(s)} />
      <Ticker />
      <CategoryNav
        active={activeCat}
        onChange={setActiveCat}
        activeSub={activeSub}
        onSubChange={setActiveSub}
      />
      <main className="px-4 sm:px-6 py-6 space-y-8 max-w-7xl">

        {activeCat === "news" && (
          <div className="flex items-start gap-3 bg-accent/40 border border-accent rounded-lg p-4 text-sm">
            <GraduationCap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <span className="font-semibold">New?</span>{" "}
              Pick any stock for a plain-English explainer, or tap the ✨ sparkle in the corner — Integral AI can take you anywhere and customize the dashboard for you.
            </p>
          </div>
        )}

        <div className="space-y-6 min-w-0">
          {!isNewsRoute && activeCat !== "news" && (
            <div id="chart-top" />
          )}
          {!isNewsRoute && (
            <div className="grid lg:grid-cols-[minmax(0,400px)_1fr] gap-6 items-start">
              <div className="space-y-6 order-2 lg:order-1">
                <Suspense fallback={<div className="h-32" />}>
                  <StockSummary symbol={activeSymbol} />
                </Suspense>
                <div id="summary"><StockExplainer symbol={activeSymbol} /></div>
              </div>
              <div id="chart" className="order-1 lg:order-2"><StockChart symbol={activeSymbol} /></div>
            </div>
          )}
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

        {activeCat === "news" && !isNewsRoute && (
        <section aria-labelledby="about-heading" className="border-t pt-6 mt-6">
          <div className="grid md:grid-cols-[1fr_240px] gap-6 items-start">
            <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
              <h2 id="about-heading" className="!mb-2 !mt-0">What is IntegralStocks?</h2>
              <p className="!my-2">
                <strong>IntegralStocks</strong> is a free, beginner-friendly dashboard that brings live{" "}
                <Link to="/stocks">stock prices</Link>, the day's <Link to="/news">market news</Link>, and
                short, plain-English AI insights into one place — so anyone can understand what's moving the
                market and why. Every ticker comes with an explainer of what the company does and an AI
                summary of the news driving today's move.
              </p>
              <p className="!my-2 text-sm text-muted-foreground">
                Live prices · AI insights that explain moves · curated{" "}
                <Link to="/news">news</Link> · sector heatmaps · an{" "}
                <Link to="/calendar">economic calendar</Link> · a{" "}
                <Link to="/screener">screener</Link> · and a free{" "}
                <Link to="/sim">paper trading simulator</Link>.
              </p>
              <p className="!my-2 text-sm text-muted-foreground">
                <Link to="/faq">FAQ</Link> · <Link to="/about">About</Link> ·{" "}
                <Link to="/contact">Contact</Link> · <Link to="/data-sources">Data sources</Link> ·{" "}
                <Link to="/disclaimer">Disclaimer</Link>
              </p>
            </div>
            <img
              src={heroImage}
              alt="Beginner stock market chart showing a rising green candlestick price trend on a modern dashboard"
              width={1280}
              height={640}
              loading="lazy"
              className="rounded-lg border w-full h-auto"
            />
          </div>
        </section>
        )}
      </main>

      <SiteFooter />
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
