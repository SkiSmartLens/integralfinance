import { lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { StockChart } from "@/components/StockChart";
import { StockExplainer } from "@/components/StockExplainer";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { formatNumber } from "@/lib/yahoo";
import { cn } from "@/lib/utils";
import { ArrowRight, LineChart } from "lucide-react";

const StockSummary = lazy(() =>
  import("@/components/StockSummary").then((m) => ({ default: m.StockSummary })),
);
const NewsList = lazy(() =>
  import("@/components/NewsList").then((m) => ({ default: m.NewsList })),
);

const SYMBOL = "^GSPC";

const SpyLanding = () => {
  const nav = useNavigate();
  const { quotes } = useLiveQuotes([SYMBOL], 8000);
  const q = quotes[0];
  const name = q?.longName || q?.shortName || "S&P 500";
  const last = q?.regularMarketPrice;
  const ch = Number(q?.regularMarketChangePercent ?? 0);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="S&P 500 Live Signals — IntegralStocks"
        description="Live S&P 500 (^GSPC) index quote, interactive chart, plain-English AI signals and analysis, key stats, and the latest market-moving news."
        path="/"
      />
      <Header onSearch={(s) => nav(`/stocks/${s.toLowerCase()}`)} />

      <div className="border-b bg-gradient-to-r from-card via-card to-muted/30">
        <div className="px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap max-w-5xl mx-auto">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-primary bg-accent px-2.5 py-1 rounded-full">
            <LineChart className="w-3.5 h-3.5" /> Market Signals
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight">{name} <span className="text-muted-foreground font-bold">({SYMBOL})</span></h1>
          <div className="ml-auto flex items-center gap-3">
            {last != null && (
              <>
                <div className="text-2xl font-bold tabular-nums">{formatNumber(last)}</div>
                <div className={cn("text-sm font-semibold tabular-nums", ch >= 0 ? "text-up" : "text-down")}>
                  {ch >= 0 ? "+" : ""}{formatNumber(ch)}%
                </div>
              </>
            )}
            <Link
              to="/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-extrabold hover:opacity-90 transition-opacity"
            >
              Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <main className="px-4 sm:px-6 py-6 space-y-6 max-w-5xl mx-auto">
        <div id="chart"><StockChart symbol={SYMBOL} /></div>
        <StockExplainer symbol={SYMBOL} />
        <Suspense fallback={<div className="h-32" />}>
          <StockSummary symbol={SYMBOL} />
        </Suspense>
        <section>
          <h2 className="text-2xl font-bold mb-4">
            S&P 500 News <span className="text-muted-foreground font-normal text-base">· latest stories</span>
          </h2>
          <Suspense fallback={<div className="text-muted-foreground py-8 text-center">Loading stories…</div>}>
            <NewsList query="S&P 500" />
          </Suspense>
        </section>

        <div className="sm:hidden pt-2">
          <Link
            to="/dashboard"
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-full bg-primary text-primary-foreground text-sm font-extrabold"
          >
            Open Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default SpyLanding;