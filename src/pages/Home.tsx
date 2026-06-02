import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Lock, Clock, Search, ShieldAlert, Share2 } from "lucide-react";
import { toast } from "sonner";
import { HomeHeader } from "@/components/HomeHeader";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { IntroSplash, hasSeenIntro } from "@/components/IntroSplash";
import { GLOSSARY } from "@/components/Glossary";
import { cn } from "@/lib/utils";

const SITE_URL = "https://integralstocks.com";

async function shareLesson(title: string, to: string) {
  const url = `${SITE_URL}${to}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: `Integral Stocks · ${title}`, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success("Lesson link copied!");
  } catch {
    /* user cancelled share */
  }
}

const LESSONS = [
  { n: 1, title: "What is a stock, really?", read: "4 min", to: "/learn/basics" },
  { n: 2, title: "How the market actually moves", read: "6 min", to: "/learn/basics" },
  { n: 3, title: "Reading a price chart", read: "5 min", to: "/learn/patterns" },
  { n: 4, title: "Risk, diversification & ETFs", read: "7 min", to: "/learn/indicators", locked: true },
  { n: 5, title: "Building your first portfolio", read: "8 min", to: "/learn/indicators", locked: true },
];

const TERMS = ["ETF", "Dividend", "Index Fund", "Bull Market", "Market Cap", "Compound Interest"];

const TERM_DEFS: Record<string, string> = {
  ETF: GLOSSARY["ETF"],
  Dividend: GLOSSARY["Dividend"],
  "Index Fund":
    "A fund that automatically buys every stock in an index (like the S&P 500). Low cost, hands-off, popular with beginners.",
  "Bull Market": "A stretch of time when prices are generally rising and investors feel optimistic.",
  "Market Cap": GLOSSARY["Market Cap"],
  "Compound Interest":
    "When your earnings start earning too. Money grows on money — the earlier you start, the bigger it gets.",
};

const ARTICLES = [
  { tag: "Basics", title: "Why your first $50 matters more than your next $5,000", read: "3 min" },
  { tag: "Mindset", title: "The boring strategy that quietly beats most traders", read: "5 min" },
  { tag: "Explained", title: "What actually happens when a stock 'goes up'", read: "4 min" },
];

const HomeContent = () => {
  const [query, setQuery] = useState("");
  const [activeTerm, setActiveTerm] = useState<string | null>(null);

  const filtered = TERMS.filter((t) => t.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Integral Stocks — Learn Investing Before You Turn 18"
        description="Beginner-friendly investing for teens: practice with $100k of fake money, bite-size lessons, a plain-English glossary, and a free simulator. No bank account needed."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Integral Stocks",
          description: "Beginner-friendly investing lessons and a free paper-trading simulator for teens.",
          url: "https://integralstocks.com/",
        }}
      />
      <HomeHeader />

      {/* Hero — full-width soft off-white */}
      <section className="bg-secondary/60">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-primary bg-accent px-3 py-1 rounded-full mb-5">
            <Sparkles className="w-3.5 h-3.5" /> Built for teens · 100% free
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
            Build your investing brain before you turn 18
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mt-5 max-w-xl mx-auto">
            Practice with <span className="font-bold text-foreground">$100,000 of fake money</span> — Learn to invest
            without the fear: Practice with $100,000 in virtual cash. No real money required. No complicated setup. Just
            pure, hands-on learning.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link
              to="/start"
              className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-primary text-primary-foreground font-extrabold text-lg hover:opacity-90 transition-opacity"
            >
              Start here <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/simulator"
              className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full border-2 border-primary text-primary font-extrabold text-lg hover:bg-accent transition-colors"
            >
              Try the simulator
            </Link>
          </div>
          <p className="text-sm font-semibold text-muted-foreground mt-5">
            Joined by <span className="text-foreground">2,400+ beginners.</span>
          </p>
        </div>
      </section>

      {/* Disclaimer banner */}
      <div className="bg-accent text-accent-foreground">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-center gap-2 text-sm font-semibold text-center">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          For educational purposes only — not financial advice.
        </div>
      </div>

      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-14 space-y-20">
        {/* Learning path */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">Your learning path</h2>
          <p className="text-muted-foreground mb-6">Five short lessons. Start at the top.</p>
          <ol className="space-y-3">
            {LESSONS.map((l) => {
              const inner = (
                <div
                  className={cn(
                    "flex items-center gap-4 rounded-2xl border p-4 transition-colors flex-1",
                    l.locked ? "opacity-50 bg-muted/40" : "bg-card hover:border-primary",
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full font-extrabold shrink-0",
                      l.locked ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
                    )}
                  >
                    {l.n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold leading-snug">{l.title}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3.5 h-3.5" /> {l.read} read
                    </div>
                  </div>
                  {l.locked ? (
                    <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                  )}
                </div>
              );
              return (
                <li key={l.n} className="flex items-stretch gap-2">
                  {l.locked ? (
                    inner
                  ) : (
                    <Link to={l.to} className="flex flex-1">
                      {inner}
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => shareLesson(l.title, l.to)}
                    aria-label={`Share "${l.title}"`}
                    title="Share this lesson"
                    className="shrink-0 flex items-center justify-center w-12 rounded-2xl border bg-card text-primary hover:border-primary hover:bg-accent transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Glossary search */}
        <section id="glossary" className="scroll-mt-20">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">Plain-English glossary</h2>
          <p className="text-muted-foreground mb-5">Tap a term to see what it actually means.</p>
          <div className="relative mb-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a term (ETF, dividend, bull market…)"
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border bg-card focus:border-primary outline-none transition-colors"
            />
          </div>
          <div className="flex flex-wrap gap-2.5">
            {filtered.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTerm(activeTerm === t ? null : t)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-bold border transition-colors",
                  activeTerm === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-accent text-accent-foreground border-transparent hover:border-primary",
                )}
              >
                {t}
              </button>
            ))}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground">No terms match "{query}".</p>}
          </div>
          {activeTerm && (
            <div className="mt-5 rounded-2xl border bg-card p-5 animate-fade-in">
              <div className="font-extrabold text-primary mb-1">{activeTerm}</div>
              <p className="text-sm leading-relaxed text-muted-foreground">{TERM_DEFS[activeTerm]}</p>
            </div>
          )}
        </section>

        {/* Article previews */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-6">Fresh reads</h2>
          <div className="divide-y border rounded-2xl overflow-hidden bg-card">
            {ARTICLES.map((a) => (
              <Link
                key={a.title}
                to="/learn/basics"
                className="flex items-center gap-4 p-5 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider text-primary bg-accent px-2 py-0.5 rounded mb-1.5">
                    {a.tag}
                  </span>
                  <div className="font-bold leading-snug">{a.title}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                    <Clock className="w-3.5 h-3.5" /> {a.read} read
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* CTA strip */}
      <section className="bg-primary text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 text-center">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-6">Ready to start?</h2>
          <Link
            to="/learn/basics"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-primary-foreground text-primary font-extrabold text-lg hover:opacity-90 transition-opacity"
          >
            Begin Lesson 1 <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

const Home = () => {
  const [showIntro, setShowIntro] = useState(() => !hasSeenIntro());
  return (
    <>
      {showIntro && <IntroSplash onEnter={() => setShowIntro(false)} />}
      <div className={cn("transition-opacity duration-500", showIntro ? "opacity-0" : "opacity-100 animate-fade-in")}>
        <HomeContent />
      </div>
    </>
  );
};

export default Home;
