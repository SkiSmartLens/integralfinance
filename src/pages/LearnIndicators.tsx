import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { cn } from "@/lib/utils";
import { Heart, Flame, Star, Check, X, ArrowRight, Trophy, RotateCcw, LineChart } from "lucide-react";

/* ------------------------------ Lessons ----------------------------------- */

interface Lesson {
  id: string;
  title: string;
  body: string;
  quiz: { q: string; choices: string[]; answer: string; explain: string };
}

const LESSONS: Lesson[] = [
  {
    id: "sma",
    title: "Simple Moving Average (SMA)",
    body:
      "The SMA averages the closing price over the last N days. A 50-day SMA smooths out daily noise so you can see the underlying trend. Price above its SMA = uptrend bias; price below = downtrend bias.",
    quiz: {
      q: "A 50-day SMA tells you…",
      choices: [
        "The average closing price of the last 50 days",
        "Tomorrow's predicted high",
        "The total volume over 50 days",
      ],
      answer: "The average closing price of the last 50 days",
      explain: "It's a rolling average — useful for spotting trend direction.",
    },
  },
  {
    id: "ema",
    title: "Exponential Moving Average (EMA)",
    body:
      "The EMA is like the SMA but weights recent prices more heavily, so it reacts faster to new moves. Traders often pair the 12-EMA and 26-EMA to spot momentum shifts before a slower SMA would.",
    quiz: {
      q: "Compared to the SMA, the EMA…",
      choices: [
        "Reacts faster because it weights recent prices more",
        "Always lags further behind price",
        "Ignores closing prices entirely",
      ],
      answer: "Reacts faster because it weights recent prices more",
      explain: "Heavier recent-price weighting = quicker response.",
    },
  },
  {
    id: "golden-cross",
    title: "Golden Cross & Death Cross",
    body:
      "A Golden Cross happens when the 50-day SMA crosses ABOVE the 200-day SMA — a classic bullish signal. A Death Cross is the opposite: 50-day cutting BELOW the 200-day, often a bearish warning.",
    quiz: {
      q: "A Golden Cross is when the…",
      choices: [
        "50-day SMA crosses above the 200-day SMA",
        "Price doubles in a single week",
        "RSI hits 100",
      ],
      answer: "50-day SMA crosses above the 200-day SMA",
      explain: "Short-term trend overtaking the long-term trend → bullish.",
    },
  },
  {
    id: "rsi",
    title: "RSI (Relative Strength Index)",
    body:
      "RSI is a momentum oscillator from 0 to 100. Above 70 = often overbought (a pullback may be due). Below 30 = often oversold (a bounce may be due). It doesn't predict price — it measures the speed of recent moves.",
    quiz: {
      q: "An RSI reading above 70 typically suggests a stock is…",
      choices: ["Overbought", "Oversold", "About to be delisted"],
      answer: "Overbought",
      explain: ">70 overbought, <30 oversold. Not a guaranteed reversal — just a warning.",
    },
  },
  {
    id: "macd",
    title: "MACD",
    body:
      "MACD = 12-EMA minus 26-EMA, plotted with a 9-EMA 'signal line'. When MACD crosses above the signal line, momentum is shifting bullish. When it crosses below, momentum is turning bearish. The histogram shows the gap between them.",
    quiz: {
      q: "MACD measures…",
      choices: [
        "The difference between two EMAs to gauge momentum",
        "The number of shares traded today",
        "The company's earnings per share",
      ],
      answer: "The difference between two EMAs to gauge momentum",
      explain: "It's a momentum indicator built from two EMAs and a signal line.",
    },
  },
  {
    id: "bollinger",
    title: "Bollinger Bands",
    body:
      "Bollinger Bands wrap price between an upper and lower band set 2 standard deviations from a 20-day SMA. Bands widen when volatility rises and pinch tight when it drops — a 'squeeze' often precedes a big move.",
    quiz: {
      q: "A Bollinger Band 'squeeze' often signals…",
      choices: [
        "Low volatility that may precede a big move",
        "A guaranteed price drop",
        "The end of the trading day",
      ],
      answer: "Low volatility that may precede a big move",
      explain: "Tight bands = quiet market = energy building for the next move.",
    },
  },
  {
    id: "volume",
    title: "Volume",
    body:
      "Volume is the number of shares traded in a period. Big price moves on high volume are more trustworthy than the same move on low volume. Volume confirms — a breakout without volume often fails.",
    quiz: {
      q: "A breakout is more reliable when it happens on…",
      choices: ["High volume", "Low volume", "Zero volume"],
      answer: "High volume",
      explain: "Volume = participation. Real moves bring real volume.",
    },
  },
  {
    id: "vwap",
    title: "VWAP",
    body:
      "VWAP = Volume-Weighted Average Price for the day. Big institutions use it as a benchmark. Price above VWAP = bulls in control intraday; price below = bears in control. It resets every session.",
    quiz: {
      q: "VWAP resets…",
      choices: ["Every trading day", "Every month", "Never — it's lifetime"],
      answer: "Every trading day",
      explain: "VWAP is an intraday benchmark, restarting each session.",
    },
  },
  {
    id: "atr",
    title: "ATR (Average True Range)",
    body:
      "ATR measures average daily price range over N periods (usually 14). It's a volatility gauge, not a direction signal. Traders use ATR to size positions and set stop-loss distances — wider ATR = wider stops.",
    quiz: {
      q: "ATR is mainly used to measure…",
      choices: ["Volatility", "Direction of the trend", "Dividend payouts"],
      answer: "Volatility",
      explain: "It tells you how much a stock typically moves, not which way.",
    },
  },
  {
    id: "stochastic",
    title: "Stochastic Oscillator",
    body:
      "Stochastic compares the current close to the high/low range over a lookback period, on a 0–100 scale. Like RSI: >80 = overbought, <20 = oversold. The %K line crossing the %D line is a common trigger.",
    quiz: {
      q: "A Stochastic reading below 20 suggests…",
      choices: ["Oversold conditions", "A confirmed uptrend", "High dividend yield"],
      answer: "Oversold conditions",
      explain: "<20 oversold, >80 overbought — similar logic to RSI.",
    },
  },
  {
    id: "support-resistance",
    title: "Support & Resistance",
    body:
      "Support is a price level where buyers tend to step in (the floor). Resistance is where sellers tend to appear (the ceiling). When price breaks resistance, it often becomes new support — and vice versa.",
    quiz: {
      q: "When price breaks above resistance, that level often…",
      choices: [
        "Becomes new support",
        "Disappears forever",
        "Forces an automatic stock split",
      ],
      answer: "Becomes new support",
      explain: "Old ceilings frequently turn into new floors. Classic role-reversal.",
    },
  },
  {
    id: "fibonacci",
    title: "Fibonacci Retracements",
    body:
      "After a big move, price often pulls back to 38.2%, 50%, or 61.8% of the move before continuing. These Fibonacci levels are common spots where traders watch for bounces or reversals.",
    quiz: {
      q: "Which of these is a key Fibonacci retracement level?",
      choices: ["61.8%", "73.2%", "12.5%"],
      answer: "61.8%",
      explain: "The classic Fib levels are 23.6%, 38.2%, 50%, 61.8%, and 78.6%.",
    },
  },
];

/* ------------------------------ Page state -------------------------------- */

type Mode = "menu" | "lesson" | "result";

const STORAGE_KEY = "learn:indicators:v1";
const loadStats = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as { xp: number; streak: number; lastDay: string; mastered: string[] };
  } catch {/* ignore */}
  return { xp: 0, streak: 0, lastDay: "", mastered: [] as string[] };
};
const saveStats = (s: ReturnType<typeof loadStats>) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {/* ignore */}
};

export default function LearnIndicators() {
  const [mode, setMode] = useState<Mode>("menu");
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"read" | "quiz">("read");
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [stats, setStats] = useState(loadStats());

  useEffect(() => { saveStats(stats); }, [stats]);

  const lesson = LESSONS[idx];

  const start = (from = 0) => {
    setIdx(from); setPhase("read"); setPicked(null); setHearts(3); setCorrectCount(0); setMode("lesson");
  };

  const answer = (choice: string) => {
    if (picked) return;
    setPicked(choice);
    const correct = choice === lesson.quiz.answer;
    if (correct) {
      setCorrectCount((c) => c + 1);
      setStats((s) => {
        const today = new Date().toDateString();
        const streak = s.lastDay === today ? s.streak : s.streak + 1;
        return {
          ...s,
          xp: s.xp + 10,
          streak,
          lastDay: today,
          mastered: Array.from(new Set([...s.mastered, lesson.id])),
        };
      });
    } else {
      setHearts((h) => Math.max(0, h - 1));
    }
    setTimeout(() => {
      setPicked(null);
      if (!correct && hearts - 1 <= 0) { setMode("result"); return; }
      if (idx + 1 >= LESSONS.length) { setMode("result"); return; }
      setIdx((i) => i + 1);
      setPhase("read");
    }, 1100);
  };

  const progress = useMemo(() => {
    if (mode !== "lesson") return 0;
    return ((idx + (phase === "quiz" ? 0.5 : 0)) / LESSONS.length) * 100;
  }, [mode, idx, phase]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Learn Stock Indicators — RSI, MACD, Moving Averages & More"
        description="Beginner-friendly interactive lessons on the most popular technical indicators: SMA, EMA, RSI, MACD, Bollinger Bands, VWAP, ATR, Stochastic, support/resistance, and Fibonacci."
        path="/learn/indicators"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "LearningResource",
          name: "Stock Market Indicators",
          educationalLevel: "Beginner",
          learningResourceType: "Interactive lesson",
          teaches: LESSONS.map((l) => l.title).join(", "),
        }}
      />
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-bold flex items-center gap-1.5"><LineChart className="w-4 h-4" /> Learn · Indicators</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-bold">
            <span className="flex items-center gap-1 text-orange-500"><Flame className="w-4 h-4 fill-orange-500" /> {stats.streak}</span>
            <span className="flex items-center gap-1 text-yellow-500"><Star className="w-4 h-4 fill-yellow-500" /> {stats.xp} XP</span>
            {mode === "lesson" && phase === "quiz" && (
              <span className="flex items-center gap-0.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Heart
                    key={i}
                    className={cn("w-4 h-4", i < hearts ? "fill-red-500 text-red-500" : "text-muted-foreground/40")}
                  />
                ))}
              </span>
            )}
          </div>
        </div>

        {mode === "lesson" && (
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-gradient-to-r from-up to-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {mode === "menu" && (
          <>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Technical indicators
            </h1>
            <p className="text-muted-foreground mt-2 mb-6">
              {LESSONS.length} bite-sized lessons on the indicators you'll see on every chart. Learn what they mean and when traders actually use them.
            </p>

            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              <button
                onClick={() => start(0)}
                className="text-left p-5 rounded-2xl bg-card border-2 border-b-4 border-primary/60 hover:translate-y-[-2px] hover:border-primary transition-all"
              >
                <div className="text-xs uppercase tracking-wider text-primary font-bold mb-1">Start here</div>
                <div className="text-lg font-bold mb-1">Begin from the top</div>
                <div className="text-sm text-muted-foreground">~6 minutes · earn {LESSONS.length * 10} XP</div>
              </button>
              <Link
                to="/learn/patterns"
                className="text-left p-5 rounded-2xl bg-card border-2 border-b-4 hover:translate-y-[-2px] hover:border-foreground/40 transition-all"
              >
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">Next up</div>
                <div className="text-lg font-bold mb-1">Chart patterns →</div>
                <div className="text-sm text-muted-foreground">Pair indicators with classic chart shapes</div>
              </Link>
            </div>

            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">All lessons</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {LESSONS.map((l, i) => {
                const done = stats.mastered.includes(l.id);
                return (
                  <button
                    key={l.id}
                    onClick={() => start(i)}
                    className="text-left p-3 rounded-xl bg-card border hover:border-primary/60 transition-colors"
                  >
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
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">
              Lesson {idx + 1} of {LESSONS.length}
            </div>
            <h2 className="text-2xl font-extrabold mb-3">{lesson.title}</h2>
            <p className="leading-relaxed mb-6">{lesson.body}</p>
            <div className="flex justify-between gap-2">
              <button
                onClick={() => setMode("menu")}
                className="px-4 py-2.5 rounded-xl border-2 border-b-4 font-bold text-sm hover:bg-muted"
              >
                Exit
              </button>
              <button
                onClick={() => setPhase("quiz")}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground border-2 border-b-4 border-primary font-bold text-sm flex items-center gap-1.5 hover:opacity-90"
              >
                Quick check <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {mode === "lesson" && phase === "quiz" && lesson && (
          <div className="bg-card border-2 border-b-4 rounded-2xl p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">
              Quick check · Lesson {idx + 1}
            </div>
            <h2 className="text-xl font-extrabold mb-5">{lesson.quiz.q}</h2>
            <div className="grid gap-2">
              {lesson.quiz.choices.map((c) => {
                const isCorrect = c === lesson.quiz.answer;
                const isPicked = picked === c;
                return (
                  <button
                    key={c}
                    onClick={() => answer(c)}
                    disabled={picked != null}
                    className={cn(
                      "p-3 rounded-xl border-2 border-b-4 font-semibold text-sm text-left transition-colors",
                      picked == null && "hover:border-primary/60",
                      picked != null && isCorrect && "bg-up/15 border-up text-up",
                      picked != null && isPicked && !isCorrect && "bg-down/15 border-down text-down",
                      picked != null && !isPicked && !isCorrect && "opacity-50",
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      {picked != null && isCorrect && <Check className="w-4 h-4" />}
                      {picked != null && isPicked && !isCorrect && <X className="w-4 h-4" />}
                      {c}
                    </span>
                  </button>
                );
              })}
            </div>
            {picked != null && (
              <p className="mt-4 text-sm text-muted-foreground italic">{lesson.quiz.explain}</p>
            )}
          </div>
        )}

        {mode === "result" && (
          <div className="bg-card border-2 border-b-4 rounded-2xl p-8 text-center">
            <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-3" />
            <h2 className="text-2xl font-extrabold mb-1">
              {hearts > 0 ? "Indicators complete!" : "Out of hearts"}
            </h2>
            <p className="text-muted-foreground mb-5">
              You got <span className="font-bold text-foreground">{correctCount}</span> of{" "}
              <span className="font-bold text-foreground">{LESSONS.length}</span> correct ·{" "}
              <span className="text-yellow-500 font-bold">+{correctCount * 10} XP</span>
            </p>
            <div className="flex justify-center gap-2 flex-wrap">
              <button
                onClick={() => start(0)}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground border-2 border-b-4 border-primary font-bold text-sm flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" /> Try again
              </button>
              <Link
                to="/learn/patterns"
                className="px-5 py-2.5 rounded-xl border-2 border-b-4 font-bold text-sm"
              >
                Next: Patterns →
              </Link>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
