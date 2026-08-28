import { lazy, Suspense, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { StockChart } from "@/components/StockChart";
import { StockExplainer } from "@/components/StockExplainer";
import { SiteFooter } from "@/components/SiteFooter";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { formatNumber } from "@/lib/yahoo";
import { cn } from "@/lib/utils";
import { ArrowLeft, LineChart, Newspaper, SlidersHorizontal } from "lucide-react";
import { AcademyPrompt } from "@/components/AcademyPrompt";

const StockSummary = lazy(() =>
  import("@/components/StockSummary").then((m) => ({ default: m.StockSummary }))
);
const NewsList = lazy(() =>
  import("@/components/NewsList").then((m) => ({ default: m.NewsList }))
);
const OptionsChain = lazy(() =>
  import("@/components/OptionsChain").then((m) => ({ default: m.OptionsChain }))
);

type TabId = "overview" | "news" | "advanced";

const TABS: { id: TabId; label: string; icon: typeof LineChart }[] = [
  { id: "overview", label: "Overview", icon: LineChart },
  { id: "news", label: "News", icon: Newspaper },
  { id: "advanced", label: "Advanced", icon: SlidersHorizontal },
];

const StockTicker = () => {
  const { ticker = "AAPL" } = useParams();
  const symbol = ticker.toUpperCase();
  const nav = useNavigate();
  const { quotes } = useLiveQuotes([symbol], 8000);
  const q = quotes[0];
  const name = q?.longName || q?.shortName || symbol;
  const last = q?.regularMarketPrice;
  const ch = Number(q?.regularMarketChangePercent ?? 0);
  const [tab, setTab] = useState<TabId>("overview");

  const title = `${symbol} (${name}) Stock Price & Chart | IntegralStocks`;
  const priceBit = last != null ? `Live price $${formatNumber(last)} (${ch >= 0 ? "+" : ""}${formatNumber(ch)}%).` : "";
  const description = `${name} (${symbol}) live chart plus a plain-English AI breakdown of why the stock is moving today. ${priceBit} Beginner-friendly.`.slice(0, 300);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={title}
        description={description}
        path={`/stocks/${symbol.toLowerCase()}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: title,
          description,
          url: `https://integralstocks.com/stocks/${symbol.toLowerCase()}`,
        }}
      />
      <Header onSearch={(s) => nav(`/stocks/${s.toLowerCase()}`)} />

      <div className="border-b bg-gradient-to-r from-card via-card to-muted/30">
        <div className="px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap max-w-5xl">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-2xl font-extrabold tracking-tight">{name} ({symbol})</h1>
          <div className="ml-auto flex items-center gap-3">
            {last != null && (
              <>
                <div className="text-2xl font-bold tabular-nums">${formatNumber(last)}</div>
                <div className={cn("text-sm font-semibold tabular-nums", ch >= 0 ? "text-up" : "text-down")}>
                  {ch >= 0 ? "+" : ""}{formatNumber(ch)}%
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="border-b bg-background sticky top-0 z-10">
        <div className="px-4 sm:px-6 max-w-5xl flex gap-1" role="tablist" aria-label="Stock sections">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <main className="px-4 sm:px-6 py-6 space-y-6 max-w-5xl">
        {tab === "overview" && (
          <>
            <div id="chart"><StockChart symbol={symbol} /></div>
            <AcademyPrompt moduleId={2} hint="Learn: how to read a stock chart" />
            <StockExplainer symbol={symbol} />
            <Suspense fallback={<div className="h-32" />}>
              <StockSummary symbol={symbol} />
            </Suspense>
          </>
        )}

        {tab === "news" && (
          <section>
            <h2 className="text-2xl font-bold mb-4">
              {symbol} News <span className="text-muted-foreground font-normal text-base">· latest stories</span>
            </h2>
            <Suspense fallback={<div className="text-muted-foreground py-8 text-center">Loading stories…</div>}>
              <NewsList query={symbol} />
            </Suspense>
          </section>
        )}

        {tab === "advanced" && (
          <section className="space-y-4">
            <Suspense fallback={<div className="h-24" />}>
              <OptionsChain symbol={symbol} />
            </Suspense>
          </section>
        )}
      </main>


      <SiteFooter />
    </div>
  );
};

export default StockTicker;
