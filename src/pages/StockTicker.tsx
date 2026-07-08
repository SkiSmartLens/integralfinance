import { lazy, Suspense } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { StockChart } from "@/components/StockChart";
import { StockExplainer } from "@/components/StockExplainer";
import { SiteFooter } from "@/components/SiteFooter";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { formatNumber } from "@/lib/yahoo";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

const StockSummary = lazy(() =>
  import("@/components/StockSummary").then((m) => ({ default: m.StockSummary }))
);
const NewsList = lazy(() =>
  import("@/components/NewsList").then((m) => ({ default: m.NewsList }))
);
const OptionsChain = lazy(() =>
  import("@/components/OptionsChain").then((m) => ({ default: m.OptionsChain }))
);

const StockTicker = () => {
  const { ticker = "AAPL" } = useParams();
  const symbol = ticker.toUpperCase();
  const nav = useNavigate();
  const { quotes } = useLiveQuotes([symbol], 8000);
  const q = quotes[0];
  const name = q?.longName || q?.shortName || symbol;
  const last = q?.regularMarketPrice;
  const ch = Number(q?.regularMarketChangePercent ?? 0);

  const title = `${name} (${symbol}) Stock Price — Beginner Guide | IntegralStocks`;
  const description = `Live ${name} (${symbol}) stock price, interactive chart, and a plain-English AI explanation of why ${symbol} is moving today. Built for beginner investors.`;

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

      <main className="px-4 sm:px-6 py-6 space-y-6 max-w-5xl">
        <div id="chart"><StockChart symbol={symbol} /></div>
        <StockExplainer symbol={symbol} />
        <Suspense fallback={<div className="h-32" />}>
          <StockSummary symbol={symbol} />
        </Suspense>
        <Suspense fallback={<div className="h-24" />}>
          <OptionsChain symbol={symbol} />
        </Suspense>
        <section>
          <h2 className="text-2xl font-bold mb-4">
            {symbol} News <span className="text-muted-foreground font-normal text-base">· latest stories</span>
          </h2>
          <Suspense fallback={<div className="text-muted-foreground py-8 text-center">Loading stories…</div>}>
            <NewsList query={symbol} />
          </Suspense>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default StockTicker;
