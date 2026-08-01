import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Zap, LineChart } from "lucide-react";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { fetchStockSummary } from "@/lib/stockSummary";
import { fetchQuotes, formatNumber } from "@/lib/yahoo";
import { postsForTicker } from "@/content/blog";

interface Summary {
  whyMoved?: string;
  positives?: string[];
  negatives?: string[];
  outlook?: string;
  sources?: { title: string; publisher: string; url: string }[];
}

const WhyMoved = () => {
  const { ticker = "" } = useParams();
  const symbol = ticker.toUpperCase();
  const [quote, setQuote] = useState<{ price?: number; changePct?: number; name?: string } | null>(null);
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;
    let alive = true;
    fetchQuotes([symbol])
      .then((qs) => {
        if (!alive) return;
        const q = qs[0];
        setQuote({
          price: q?.regularMarketPrice,
          changePct: q?.regularMarketChangePercent,
          name: q?.longName || q?.shortName || symbol,
        });
      })
      .catch(() => {});
    fetchStockSummary(symbol)
      .then((d) => { if (alive) setData(d as Summary); })
      .catch((e: Error) => { if (alive) setErr(e.message); })
      .finally(() => { if (alive) setLoading(false); });

    return () => {
      alive = false;
    };
  }, [symbol]);

  const related = postsForTicker(symbol).slice(0, 3);
  const up = (quote?.changePct ?? 0) >= 0;
  const title = `Why Did ${symbol} Stock Move Today? | Integral Stocks`;
  const description = `Plain-English explanation of what's driving ${quote?.name || symbol} (${symbol}) stock today, grounded in real, recent news headlines.`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={title}
        description={description}
        path={`/blog/why-did-${symbol.toLowerCase()}-move-today`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: `Why did ${symbol} stock move today?`,
          description,
          author: { "@type": "Organization", name: "IntegralStocks" },
          publisher: {
            "@type": "Organization",
            name: "IntegralStocks",
            logo: { "@type": "ImageObject", url: "https://integralstocks.com/favicon.png" },
          },
          mainEntityOfPage: `https://integralstocks.com/blog/why-did-${symbol.toLowerCase()}-move-today`,
        }}
      />
      <Header />
      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 flex-1">
        <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> All posts
        </Link>

        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-primary bg-accent px-3 py-1 rounded-full mb-4">
          <Zap className="w-3.5 h-3.5" /> Live explainer
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] mb-3">
          Why did {symbol} stock move today?
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground mb-6 max-w-2xl">
          {quote?.name ? `${quote.name} (${symbol})` : symbol} — updated with the latest real news our AI can find on the stock right now.
        </p>

        {quote?.price != null && (
          <div className="flex items-baseline gap-3 mb-8">
            <span className="text-3xl font-extrabold tabular-nums">${formatNumber(quote.price)}</span>
            {quote.changePct != null && (
              <span className={`text-sm font-bold ${up ? "text-up" : "text-down"}`}>
                {up ? "+" : ""}
                {formatNumber(quote.changePct)}% today
              </span>
            )}
          </div>
        )}

        <article className="space-y-5 text-base leading-relaxed">
          {loading && <p className="text-muted-foreground">Looking up the latest news for {symbol}…</p>}
          {err && !data && (
            <p className="bg-muted/40 rounded-md p-4 text-sm text-muted-foreground">
              We couldn't generate a live explanation right now. Try again in a moment, or view the{" "}
              <Link to={`/stocks/${symbol.toLowerCase()}`} className="underline font-semibold">
                {symbol} stock page
              </Link>{" "}
              for the full chart and news feed.
            </p>
          )}
          {data?.whyMoved && (
            <>
              <h2 className="text-2xl font-extrabold tracking-tight mt-2">What's driving the move</h2>
              <p>{data.whyMoved}</p>
            </>
          )}
          {data?.positives && data.positives.length > 0 && (
            <>
              <h2 className="text-2xl font-extrabold tracking-tight mt-4">Positives right now</h2>
              <ul className="list-disc pl-5 space-y-1.5">
                {data.positives.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </>
          )}
          {data?.negatives && data.negatives.length > 0 && (
            <>
              <h2 className="text-2xl font-extrabold tracking-tight mt-4">Risks and pushback</h2>
              <ul className="list-disc pl-5 space-y-1.5">
                {data.negatives.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </>
          )}
          {data?.outlook && (
            <>
              <h2 className="text-2xl font-extrabold tracking-tight mt-4">Near-term outlook</h2>
              <p>{data.outlook}</p>
            </>
          )}
          {data?.sources && data.sources.length > 0 && (
            <>
              <h2 className="text-2xl font-extrabold tracking-tight mt-4">Sources</h2>
              <ul className="space-y-2 text-sm">
                {data.sources.map((s, i) => (
                  <li key={i}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold hover:underline">
                      {s.title}
                    </a>{" "}
                    <span className="text-muted-foreground">· {s.publisher}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </article>

        <section className="mt-10 border-t pt-8">
          <h2 className="text-lg font-extrabold flex items-center gap-2 mb-4">
            <LineChart className="w-4 h-4 text-primary" /> Keep researching {symbol}
          </h2>
          <Link
            to={`/stocks/${symbol.toLowerCase()}`}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:opacity-90"
          >
            Open the full {symbol} page <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>

        {related.length > 0 && (
          <section className="mt-10 border-t pt-8">
            <h2 className="text-lg font-extrabold mb-4">Related articles</h2>
            <ul className="space-y-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link to={`/blog/${r.slug}`} className="group inline-flex items-center gap-1 font-bold hover:text-primary">
                    {r.title} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default WhyMoved;
