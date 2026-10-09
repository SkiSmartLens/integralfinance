import { lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { StockChart } from "@/components/StockChart";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { formatNumber } from "@/lib/yahoo";
import { cn } from "@/lib/utils";
import { ArrowRight, LineChart } from "lucide-react";

// Retry a failed section import once (transient rebuild/deploy hiccup), then
// reload the page once per 10s instead of leaving a blank screen.
const retryImport = <T,>(load: () => Promise<T>): Promise<T> =>
  load().catch(
    () =>
      new Promise<T>((resolve, reject) =>
        setTimeout(() => {
          load().then(resolve).catch((e) => {
            const key = "section-reload-at";
            const last = Number(sessionStorage.getItem(key) ?? 0);
            if (Date.now() - last > 10_000) {
              sessionStorage.setItem(key, String(Date.now()));
              window.location.reload();
            }
            reject(e);
          });
        }, 800),
      ),
  );

const StockSummary = lazy(() =>
  retryImport(() => import("@/components/StockSummary")).then((m) => ({ default: m.StockSummary })),
);
const StockExplainer = lazy(() =>
  retryImport(() => import("@/components/StockExplainer")).then((m) => ({ default: m.StockExplainer })),
);
const NewsList = lazy(() =>
  retryImport(() => import("@/components/NewsList")).then((m) => ({ default: m.NewsList })),
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
        title="Free AI Investing App for Beginners | IntegralStocks"
        description="IntegralStocks is a free AI investing app for beginners: plain-English AI stock analysis, live S&P 500 signals, and a risk-free simulator to practice before you invest."
        path="/"
        keywords="AI investing app for beginners, AI investing app, AI investing basics, AI powered stock website for beginners, AI stock website, AI stock app for beginners, AI powered investing app, best stock app for beginners, AI stock analysis, stock market for beginners, learn to invest, stock market simulator, paper trading, stock news, S&P 500, live stock prices, how to invest, beginner investing app"
      />
      <Header onSearch={(s) => nav(`/stocks/${encodeURIComponent(s.toLowerCase())}`)} />

      <section className="px-4 sm:px-6 pt-6 pb-4 max-w-5xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
          Free AI investing app for beginners
        </h1>
        <p className="mt-2 text-muted-foreground max-w-2xl leading-relaxed">
          See why the market moved today in plain English, learn the basics in short{" "}
          <Link to="/learn" className="text-primary font-semibold hover:underline">lessons</Link>, and practice with
          $100,000 of virtual cash in the{" "}
          <Link to="/simulator" className="text-primary font-semibold hover:underline">simulator</Link> before you
          risk real money.
        </p>
      </section>

      <div className="border-b bg-gradient-to-r from-card via-card to-muted/30">
        <div className="px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap max-w-5xl mx-auto">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-primary bg-accent px-2.5 py-1 rounded-full">
            <LineChart className="w-3.5 h-3.5" /> Market Signals
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight">{name} <span className="text-muted-foreground font-bold">({SYMBOL})</span></h2>
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
              to="/stocks"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-extrabold hover:opacity-90 transition-opacity"
            >
              Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <main className="px-4 sm:px-6 py-6 space-y-6 max-w-5xl mx-auto">
        <div id="chart"><StockChart symbol={SYMBOL} /></div>
        <Suspense fallback={<div className="h-32" />}>
          <StockExplainer symbol={SYMBOL} eager />
        </Suspense>
        <Suspense fallback={<div className="h-32" />}>
          <StockSummary symbol={SYMBOL} />
        </Suspense>
        <section>
          <h2 className="text-2xl font-bold mb-4">
            S&P 500 News <span className="text-muted-foreground font-normal text-base">· latest stories</span>
          </h2>
          <Suspense fallback={<div className="text-muted-foreground py-8 text-center">Loading stories…</div>}>
            <NewsList query={["^GSPC", "SPY", "S&P 500"]} />
          </Suspense>
        </section>

        <div className="sm:hidden pt-2">
          <Link
            to="/stocks"
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