import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { cn } from "@/lib/utils";
import { Heart, Flame, Star, Check, X, ArrowRight, Trophy, RotateCcw, TrendingUp } from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  body: string;
  quiz: { q: string; choices: string[]; answer: string; explain: string };
}

const LESSONS: Lesson[] = [
  {
    id: "reading-charts",
    title: "Reading Stock Charts",
    body: "Stock charts look intimidating at first, but they tell a simple story: what price people paid for a stock over time. The X-axis is time. The Y-axis is price. A line chart connects closing prices. A candlestick chart shows open, high, low, and close for each period. Green candles mean the price went up that day; red means it went down. The overall direction of the chart — up, down, or sideways — is called the trend.",
    quiz: { q: "What does a green candlestick mean?", choices: ["The price went up that period", "The price went down that period", "Volume was unusually high", "The stock hit a new all-time high"], answer: "The price went up that period", explain: "Green = close was higher than open. Red = close was lower than open." },
  },
  {
    id: "pe-ratio",
    title: "What Is the P/E Ratio?",
    body: "The price-to-earnings ratio (P/E) is the most widely used valuation metric in investing. It tells you how much investors are paying for each $1 of a company's earnings. Formula: P/E = Stock Price ÷ Earnings Per Share. A P/E of 20 means investors pay $20 for every $1 of profit. High P/E = investors expect fast growth. Low P/E = slower growth expected, or the stock may be undervalued. Always compare P/E to the industry average — tech companies typically have higher P/Es than banks.",
    quiz: { q: "What does P/E ratio stand for?", choices: ["Price-to-Earnings", "Profit-to-Expense", "Portfolio Equity", "Price-to-Equity"], answer: "Price-to-Earnings", explain: "P/E = Stock Price divided by Earnings Per Share. It measures how expensive a stock is relative to its profits." },
  },
  {
    id: "etfs",
    title: "Understanding ETFs",
    body: "An ETF (Exchange-Traded Fund) is a basket of stocks that trades on an exchange like a single stock. When you buy one share of SPY (the S&P 500 ETF), you instantly own tiny pieces of all 500 companies in the index. ETFs give you instant diversification at a low cost. Most ETFs have expense ratios under 0.1% — far cheaper than mutual funds. Popular ETFs: SPY (S&P 500), QQQ (Nasdaq 100), VTI (total US market).",
    quiz: { q: "What is a key benefit of ETFs?", choices: ["Instant diversification at low cost", "Guaranteed returns", "No market risk", "Higher returns than individual stocks"], answer: "Instant diversification at low cost", explain: "One ETF share gives you exposure to dozens or hundreds of stocks simultaneously." },
  },
  {
    id: "volume",
    title: "What Is Volume?",
    body: "Volume is the number of shares traded in a given period. High volume on a price move means conviction — lots of buyers or sellers agree. Low volume on a move means it may not last. Volume spikes often happen around earnings, news, or major market events. Traders use volume to confirm trends: if a stock breaks to a new high on high volume, that's a stronger signal than the same move on low volume.",
    quiz: { q: "What does high volume on a price move indicate?", choices: ["Strong conviction behind the move", "The stock is about to reverse", "Low liquidity", "The company reported bad earnings"], answer: "Strong conviction behind the move", explain: "High volume means many participants agree with the price direction — it adds credibility to the move." },
  },
  {
    id: "support-resistance",
    title: "Support and Resistance",
    body: "Support is a price level where a stock tends to stop falling and bounce back up — think of it as a floor. Resistance is a level where the stock tends to stop rising and pull back — a ceiling. These levels form because traders remember past prices and react when they return. When a stock breaks through resistance, that old ceiling can become the new floor (support). Identifying these levels helps traders make buy and sell decisions.",
    quiz: { q: "What happens when a stock breaks through resistance?", choices: ["The old resistance often becomes new support", "The stock always crashes", "Volume drops to zero", "The P/E ratio resets"], answer: "The old resistance often becomes new support", explain: "Old resistance can flip to support once broken — traders who missed the breakout buy the dip back to that level." },
  },
  {
    id: "moving-averages",
    title: "Moving Averages Explained",
    body: "A moving average smooths out price data by calculating the average price over a set number of days. The 50-day MA and 200-day MA are the most watched. When the 50-day MA crosses above the 200-day MA, it's called a Golden Cross — a bullish signal. When it crosses below, it's a Death Cross — bearish. Moving averages help filter out noise and identify the underlying trend direction.",
    quiz: { q: "What is a Golden Cross?", choices: ["50-day MA crossing above the 200-day MA", "A stock hitting an all-time high", "A bullish candlestick pattern", "Volume exceeding the 50-day average"], answer: "50-day MA crossing above the 200-day MA", explain: "Golden Cross = 50 MA above 200 MA = long-term bullish trend signal." },
  },
  {
    id: "sentiment",
    title: "What Is Market Sentiment?",
    body: "Market sentiment is the overall attitude of investors toward the market — are they feeling greedy or fearful? Bullish sentiment means investors are optimistic and buying. Bearish sentiment means they're pessimistic and selling. The CNN Fear & Greed Index measures sentiment using 7 indicators. Warren Buffett's famous advice: 'Be fearful when others are greedy, and greedy when others are fearful.' Extreme sentiment often signals a reversal.",
    quiz: { q: "When investors are extremely fearful, Buffett suggests you should be:", choices: ["Greedy — looking for buying opportunities", "Also fearful — sell everything", "Neutral and hold", "Short the market"], answer: "Greedy — looking for buying opportunities", explain: "Extreme fear often marks market bottoms. Contrarian investing means buying when others panic." },
  },
  {
    id: "earnings",
    title: "How to Read Earnings Reports",
    body: "Every quarter, public companies release earnings reports showing their financial performance. Key numbers: Revenue (total sales), EPS (earnings per share), and Guidance (outlook for next quarter). 'Beating estimates' means the company did better than Wall Street expected. Stock prices often move dramatically on earnings — sometimes even falling if results were good but not good enough. Always compare actual results to analyst consensus estimates.",
    quiz: { q: "What does 'beating estimates' mean in an earnings report?", choices: ["The company did better than Wall Street expected", "The stock price hit a new high", "The CEO exceeded their bonus target", "Revenue grew faster than expenses"], answer: "The company did better than Wall Street expected", explain: "Stocks are priced on expectations. Beating consensus estimates usually causes a positive price reaction." },
  },
];

const STORAGE_KEY = "learnReading_stats";
type Stats = { xp: number; streak: number; mastered: string[] };
const defaultStats = (): Stats => ({ xp: 0, streak: 0, mastered: [] });
const loadStats = (): Stats => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") ?? defaultStats(); } catch { return defaultStats(); } };
const saveStats = (s: Stats) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} };

export default function LearnReading() {
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState<Stats>(loadStats);
  const [mode, setMode] = useState<"menu" | "lesson" | "result">(() => {
    const id = searchParams.get("lesson");
    return id ? "lesson" : "menu";
  });
  const [idx, setIdx] = useState(() => {
    const id = searchParams.get("lesson");
    if (!id) return 0;
    const i = LESSONS.findIndex((l) => l.id === id);
    return i >= 0 ? i : 0;
  });
  const [phase, setPhase] = useState<"read" | "quiz">("read");
  const [picked, setPicked] = useState<string | null>(null);
  const [hearts, setHearts] = useState(3);
  const [correctCount, setCorrectCount] = useState(0);

  const lesson = LESSONS[idx];

  const start = (i: number) => { setIdx(i); setPhase("read"); setPicked(null); setHearts(3); setCorrectCount(0); setMode("lesson"); };

  const answer = (c: string) => {
    if (picked) return;
    setPicked(c);
    const correct = c === lesson.quiz.answer;
    if (correct) {
      setCorrectCount((n) => n + 1);
      const newStats = { ...stats, xp: stats.xp + 10, mastered: stats.mastered.includes(lesson.id) ? stats.mastered : [...stats.mastered, lesson.id] };
      setStats(newStats); saveStats(newStats);
      setTimeout(() => {
        if (idx + 1 < LESSONS.length) { setIdx(idx + 1); setPhase("read"); setPicked(null); }
        else setMode("result");
      }, 1200);
    } else {
      setHearts((h) => {
        const next = h - 1;
        if (next <= 0) setTimeout(() => setMode("result"), 1000);
        return next;
      });
    }
  };

  const progress = useMemo(() => {
    if (mode !== "lesson") return 0;
    return ((idx + (phase === "quiz" ? 0.5 : 0)) / LESSONS.length) * 100;
  }, [mode, idx, phase]);

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Reading the Market — Integral Stocks" description="Learn to read stock charts, P/E ratios, ETFs, volume, moving averages, and earnings reports." path="/learn/reading" />
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Link to="/learn" className="text-sm text-muted-foreground hover:text-foreground">← Learn</Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-bold flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-yellow-500" /> Reading the Market</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-bold">
            <span className="flex items-center gap-1 text-orange-500"><Flame className="w-4 h-4 fill-orange-500" /> {stats.streak}</span>
            <span className="flex items-center gap-1 text-yellow-500"><Star className="w-4 h-4 fill-yellow-500" /> {stats.xp} XP</span>
            {mode === "lesson" && phase === "quiz" && (
              <span className="flex items-center gap-0.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Heart key={i} className={cn("w-4 h-4", i < hearts ? "fill-red-500 text-red-500" : "text-muted-foreground/40")} />
                ))}
              </span>
            )}
          </div>
        </div>

        {mode === "lesson" && (
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-6">
            <div className="h-full bg-gradient-to-r from-yellow-500 to-primary transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        )}

        {mode === "menu" && (
          <>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Reading the Market</h1>
            <p className="text-muted-foreground mt-2 mb-6">{LESSONS.length} lessons on charts, ratios, and what drives prices. Build the skills to analyze any stock.</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              <button onClick={() => start(0)} className="text-left p-5 rounded-2xl bg-card border-2 border-b-4 border-yellow-500/60 hover:translate-y-[-2px] hover:border-yellow-500 transition-all">
                <div className="text-xs uppercase tracking-wider text-yellow-500 font-bold mb-1">Start here</div>
                <div className="text-lg font-bold mb-1">Begin from the top</div>
                <div className="text-sm text-muted-foreground">~{LESSONS.length * 9} min · earn {LESSONS.length * 10} XP</div>
              </button>
              <Link to="/learn/portfolio" className="text-left p-5 rounded-2xl bg-card border-2 border-b-4 hover:translate-y-[-2px] hover:border-foreground/40 transition-all">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">Next up</div>
                <div className="text-lg font-bold mb-1">Building a Portfolio →</div>
                <div className="text-sm text-muted-foreground">Turn knowledge into a real strategy</div>
              </Link>
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">All lessons</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {LESSONS.map((l, i) => {
                const done = stats.mastered.includes(l.id);
                return (
                  <button key={l.id} onClick={() => start(i)} className="text-left p-3 rounded-xl bg-card border hover:border-yellow-500/60 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                      <div className="font-bold truncate">{l.title}</div>
                      {done && <Check className="w-3.5 h-3.5 text-up shrink-0 ml-auto" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {mode === "lesson" && phase === "read" && lesson && (
          <div className="bg-card border-2 border-b-4 rounded-2xl p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">Lesson {idx + 1} of {LESSONS.length}</div>
            <h2 className="text-2xl font-extrabold mb-3">{lesson.title}</h2>
            <p className="leading-relaxed mb-6">{lesson.body}</p>
            <div className="flex justify-between gap-2">
              <button onClick={() => setMode("menu")} className="px-4 py-2.5 rounded-xl border-2 border-b-4 font-bold text-sm hover:bg-muted">Exit</button>
              <button onClick={() => setPhase("quiz")} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground border-2 border-b-4 border-primary font-bold text-sm flex items-center gap-1.5 hover:opacity-90">
                Quick check <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {mode === "lesson" && phase === "quiz" && lesson && (
          <div className="bg-card border-2 border-b-4 rounded-2xl p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">Quick check · Lesson {idx + 1}</div>
            <h2 className="text-xl font-extrabold mb-5">{lesson.quiz.q}</h2>
            <div className="grid gap-2">
              {lesson.quiz.choices.map((c) => {
                const isCorrect = c === lesson.quiz.answer;
                const isPicked = picked === c;
                return (
                  <button key={c} onClick={() => answer(c)} disabled={picked != null}
                    className={cn("p-3 rounded-xl border-2 border-b-4 font-semibold text-sm text-left transition-colors",
                      picked == null && "hover:border-primary/60",
                      picked != null && isCorrect && "bg-up/15 border-up text-up",
                      picked != null && isPicked && !isCorrect && "bg-down/15 border-down text-down",
                      picked != null && !isPicked && !isCorrect && "opacity-50",
                    )}>
                    <span className="inline-flex items-center gap-2">
                      {picked != null && isCorrect && <Check className="w-4 h-4" />}
                      {picked != null && isPicked && !isCorrect && <X className="w-4 h-4" />}
                      {c}
                    </span>
                  </button>
                );
              })}
            </div>
            {picked != null && <p className="mt-4 text-sm text-muted-foreground italic">{lesson.quiz.explain}</p>}
          </div>
        )}

        {mode === "result" && (
          <div className="bg-card border-2 border-b-4 rounded-2xl p-8 text-center">
            <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-3" />
            <h2 className="text-2xl font-extrabold mb-1">{hearts > 0 ? "Track complete!" : "Out of hearts"}</h2>
            <p className="text-muted-foreground mb-5">
              You got <span className="font-bold text-foreground">{correctCount}</span> of <span className="font-bold text-foreground">{LESSONS.length}</span> correct · <span className="text-yellow-500 font-bold">+{correctCount * 10} XP</span>
            </p>
            <div className="flex justify-center gap-2 flex-wrap">
              <button onClick={() => start(0)} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground border-2 border-b-4 border-primary font-bold text-sm flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4" /> Try again
              </button>
              <Link to="/learn/portfolio" className="px-5 py-2.5 rounded-xl border-2 border-b-4 font-bold text-sm">Next: Portfolio →</Link>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
