import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, GraduationCap, Clock, Newspaper, Share2, Check } from "lucide-react";
import { HomeHeader } from "@/components/HomeHeader";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { fetchNews, fetchScreener, formatNumber, NewsItem, ScreenerQuote } from "@/lib/yahoo";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function timeAgo(ts: number) {
  const s = Math.floor(Date.now() / 1000 - ts);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const todayLabel = () =>
  new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

// A small library of learning concepts, picked to match the day's market mood.
const LESSONS = {
  up: {
    concept: "Bull markets & momentum",
    body: "When most stocks are climbing together, it's called a bull market. Today's gainers show momentum in action — but remember that rising prices can tempt beginners to chase a stock after the big move has already happened. The lesson: understand why something is rising before you buy.",
    url: "/learn/basics",
    cta: "Learn the basics",
  },
  down: {
    concept: "Volatility & staying calm",
    body: "Red days feel scary, but falling prices are a normal part of investing. Today's biggest losers are a reminder that volatility cuts both ways. The lesson: a long-term investor treats dips as part of the journey, not an emergency — and never invests money they'll need soon.",
    url: "/learn/portfolio",
    cta: "Learn about portfolios",
  },
  mixed: {
    concept: "Reading the whole market",
    body: "Some stocks are up, others are down — a mixed market. This is where reading charts and indicators helps you separate noise from real signals. The lesson: don't judge the market by a single stock; look at the broader picture before making a move.",
    url: "/learn/reading",
    cta: "Learn to read the market",
  },
};

function MoverRow({ q, direction }: { q: ScreenerQuote; direction: "up" | "down" }) {
  const pct = q.regularMarketChangePercent ?? 0;
  return (
    <Link
      to={`/stocks/${q.symbol.toLowerCase()}`}
      className="flex items-center justify-between gap-3 p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="min-w-0">
        <div className="font-bold leading-tight">{q.symbol}</div>
        <div className="text-xs text-muted-foreground truncate">{q.shortName ?? q.longName}</div>
      </div>
      <div className="flex items-center gap-3 shrink-0 tabular-nums">
        <span className="text-sm font-semibold">{formatNumber(q.regularMarketPrice)}</span>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-sm font-extrabold w-20 justify-end",
            direction === "up" ? "text-up" : "text-down",
          )}
        >
          {direction === "up" ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          {pct >= 0 ? "+" : ""}
          {pct.toFixed(2)}%
        </span>
      </div>
    </Link>
  );
}

const MarketBrief = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [gainers, setGainers] = useState<ScreenerQuote[]>([]);
  const [losers, setLosers] = useState<ScreenerQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [shared, setShared] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "https://integralstocks.com/market-brief";
    const shareData = {
      title: "Daily Market Brief — Integral Stocks",
      text: "Today's top market news, biggest movers, and a beginner lesson of the day.",
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      /* user cancelled or unsupported — fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      toast.success("Link copied — share today's brief!");
      setTimeout(() => setShared(false), 2000);
    } catch {
      toast.error("Couldn't copy the link.");
    }
  };

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchNews("stock market today").catch(() => []),
      fetchScreener("day_gainers", 6).catch(() => []),
      fetchScreener("day_losers", 6).catch(() => []),
    ]).then(([n, g, l]) => {
      if (!alive) return;
      setNews(n);
      setGainers(g.slice(0, 5));
      setLosers(l.slice(0, 5));
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Determine market mood from the average move of gainers vs losers.
  const lesson = useMemo(() => {
    if (!gainers.length && !losers.length) return LESSONS.mixed;
    const gAvg = gainers.reduce((s, q) => s + (q.regularMarketChangePercent ?? 0), 0) / (gainers.length || 1);
    const lAvg = Math.abs(losers.reduce((s, q) => s + (q.regularMarketChangePercent ?? 0), 0) / (losers.length || 1));
    if (gAvg > lAvg * 1.15) return LESSONS.up;
    if (lAvg > gAvg * 1.15) return LESSONS.down;
    return LESSONS.mixed;
  }, [gainers, losers]);

  const visibleNews = news.slice(0, visibleCount);
  const [hero, ...rest] = visibleNews;
  const hasMore = news.length > visibleCount;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Daily Market Brief — Top News, Gainers & Losers | Integral Stocks"
        description="Your beginner-friendly daily market brief: today's top stock news, the biggest gainers and losers, and a lesson of the day that connects investing concepts to what's happening now."
        path="/market-brief"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Daily Market Brief",
          description: "Today's top market news, biggest gainers and losers, and a lesson of the day for beginner investors.",
          url: "https://integralstocks.com/market-brief",
        }}
      />
      <HomeHeader />

      {/* Hero */}
      <section className="bg-secondary/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-primary bg-accent px-3 py-1 rounded-full mb-4">
            <Newspaper className="w-3.5 h-3.5" /> Daily Market Brief
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.05]">
            What's moving the market today
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mt-4 max-w-2xl">
            {todayLabel()} — the top stories, the biggest winners and losers, and one lesson to help it all make sense.
          </p>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-extrabold hover:opacity-90 transition-opacity"
          >
            {shared ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {shared ? "Copied!" : "Share today's brief"}
          </button>
        </div>
      </section>

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-12 space-y-16">
        {/* Top news */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">Top stories</h2>
          <p className="text-muted-foreground mb-6">The headlines beginners should know about today.</p>
          {loading && !news.length ? (
            <div className="text-muted-foreground py-8 text-center">Loading stories…</div>
          ) : !news.length ? (
            <div className="text-muted-foreground py-8 text-center">No stories found right now.</div>
          ) : (
            <div className="space-y-5">
              {hero && (
                <a
                  href={hero.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block bg-card border rounded-2xl overflow-hidden hover:border-primary transition-colors"
                >
                  {hero.thumbnail?.resolutions?.[0]?.url && (
                    <div className="aspect-[16/8] overflow-hidden">
                      <img
                        src={hero.thumbnail.resolutions[0].url}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                      <span className="font-semibold text-primary">{hero.publisher}</span>
                      <span>·</span>
                      <span>{timeAgo(hero.providerPublishTime)}</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-extrabold leading-snug group-hover:text-primary transition-colors">
                      {hero.title}
                    </h3>
                  </div>
                </a>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rest.map((n) => (
                  <a
                    key={n.uuid}
                    href={n.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block bg-card border rounded-2xl p-4 hover:border-primary transition-colors"
                  >
                    <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                      <span className="font-semibold text-primary">{n.publisher}</span>
                      <span>·</span>
                      <span>{timeAgo(n.providerPublishTime)}</span>
                    </div>
                    <h3 className="font-bold leading-snug group-hover:text-primary transition-colors">{n.title}</h3>
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Gainers & losers */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded-2xl overflow-hidden bg-card">
            <div className="flex items-center gap-2 px-5 py-4 border-b">
              <TrendingUp className="w-5 h-5 text-up" />
              <h2 className="text-lg font-extrabold">Biggest gainers</h2>
            </div>
            {loading && !gainers.length ? (
              <div className="p-5 text-sm text-muted-foreground">Loading…</div>
            ) : !gainers.length ? (
              <div className="p-5 text-sm text-muted-foreground">No data available.</div>
            ) : (
              <div className="divide-y">
                {gainers.map((q) => (
                  <MoverRow key={q.symbol} q={q} direction="up" />
                ))}
              </div>
            )}
          </div>

          <div className="border rounded-2xl overflow-hidden bg-card">
            <div className="flex items-center gap-2 px-5 py-4 border-b">
              <TrendingDown className="w-5 h-5 text-down" />
              <h2 className="text-lg font-extrabold">Biggest losers</h2>
            </div>
            {loading && !losers.length ? (
              <div className="p-5 text-sm text-muted-foreground">Loading…</div>
            ) : !losers.length ? (
              <div className="p-5 text-sm text-muted-foreground">No data available.</div>
            ) : (
              <div className="divide-y">
                {losers.map((q) => (
                  <MoverRow key={q.symbol} q={q} direction="down" />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Lesson of the day */}
        <section>
          <div className="rounded-2xl border-2 border-primary/30 bg-accent/50 p-6 sm:p-8">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-primary bg-accent px-3 py-1 rounded-full mb-4">
              <GraduationCap className="w-3.5 h-3.5" /> Lesson of the day
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">{lesson.concept}</h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl">{lesson.body}</p>
            <Link
              to={lesson.url}
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full bg-primary text-primary-foreground font-extrabold hover:opacity-90 transition-opacity"
            >
              {lesson.cta} <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-4">
              <Clock className="w-3.5 h-3.5" /> Updated every day with the market
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default MarketBrief;
