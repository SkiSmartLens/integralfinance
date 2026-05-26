import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { cn } from "@/lib/utils";
import { Heart, Flame, Star, Check, X, ArrowRight, Trophy, RotateCcw, BookOpen } from "lucide-react";

/* ------------------------------ Lessons ----------------------------------- */

interface Lesson {
  id: string;
  title: string;
  body: string;
  quiz: { q: string; choices: string[]; answer: string; explain: string };
}

const LESSONS: Lesson[] = [
  {
    id: "what-is-stock",
    title: "What is a stock?",
    body:
      "A stock (or 'share') is a tiny slice of ownership in a public company. If a company is split into 1,000,000 shares and you own 1, you own one-millionth of it. Stock prices move every second as buyers and sellers agree on a new price.",
    quiz: {
      q: "Owning one share of a company means…",
      choices: [
        "You own a small piece of that company",
        "The company owes you money",
        "You work for that company",
      ],
      answer: "You own a small piece of that company",
      explain: "Shares = fractional ownership. No debt, no job — just a stake.",
    },
  },
  {
    id: "ticker",
    title: "Tickers & exchanges",
    body:
      "Every public stock has a short symbol called a ticker — AAPL for Apple, TSLA for Tesla, MSFT for Microsoft. Stocks trade on exchanges like NYSE and NASDAQ during market hours (9:30am–4:00pm ET on weekdays).",
    quiz: {
      q: "What is a ticker?",
      choices: [
        "A short symbol that identifies a stock",
        "A type of clock used by traders",
        "A fee paid to the exchange",
      ],
      answer: "A short symbol that identifies a stock",
      explain: "AAPL, TSLA, MSFT — these are tickers.",
    },
  },
  {
    id: "bid-ask",
    title: "Bid, ask, and spread",
    body:
      "The bid is the highest price a buyer will pay right now. The ask is the lowest price a seller will accept. The gap between them is the spread. Tight spreads = lots of liquidity; wide spreads = harder to trade efficiently.",
    quiz: {
      q: "The 'spread' is…",
      choices: [
        "The difference between the bid and the ask",
        "The total daily volume",
        "The change since yesterday's close",
      ],
      answer: "The difference between the bid and the ask",
      explain: "Bid is what buyers offer, ask is what sellers want — the gap is the spread.",
    },
  },
  {
    id: "market-cap",
    title: "Market cap",
    body:
      "Market capitalization = share price × total shares outstanding. It tells you the company's size: small-cap (< $2B), mid-cap ($2B–$10B), large-cap (> $10B), mega-cap (> $200B). Bigger usually = less volatile.",
    quiz: {
      q: "How is market cap calculated?",
      choices: [
        "Share price × total shares outstanding",
        "Revenue minus expenses",
        "Yesterday's close × today's volume",
      ],
      answer: "Share price × total shares outstanding",
      explain: "Price × shares = total value the market puts on the company.",
    },
  },
  {
    id: "dividends",
    title: "Dividends",
    body:
      "Some companies share their profits with shareholders as cash payments called dividends, usually quarterly. Not all stocks pay dividends — many growth companies reinvest profits instead. Dividend yield = annual dividend ÷ share price.",
    quiz: {
      q: "A dividend is…",
      choices: [
        "A cash payment companies share with shareholders",
        "A type of stock option",
        "A fee charged by brokers",
      ],
      answer: "A cash payment companies share with shareholders",
      explain: "Many established companies pay a slice of profits out as dividends.",
    },
  },
  {
    id: "pe-ratio",
    title: "P/E ratio",
    body:
      "Price-to-earnings ratio = share price ÷ earnings per share. A P/E of 20 means investors pay $20 today for every $1 of yearly profit. Higher P/E often means investors expect strong future growth — but it can also signal overvaluation.",
    quiz: {
      q: "A high P/E ratio usually suggests…",
      choices: [
        "Investors expect strong future growth (or it's overvalued)",
        "The company has no earnings",
        "The stock pays a high dividend",
      ],
      answer: "Investors expect strong future growth (or it's overvalued)",
      explain: "High P/E = paying a lot for current earnings, betting on future growth.",
    },
  },
  {
    id: "bull-bear",
    title: "Bull vs bear markets",
    body:
      "A bull market is a sustained period of rising prices (think bull horns charging up). A bear market is a 20%+ drop from recent highs (a bear swiping its paws down). Corrections are 10–20% drops — uncomfortable but normal.",
    quiz: {
      q: "A bear market is defined as a drop of at least…",
      choices: ["20% from recent highs", "5% in a single day", "50% over a decade"],
      answer: "20% from recent highs",
      explain: "20%+ = bear market. 10–20% = correction.",
    },
  },
  {
    id: "orders",
    title: "Market vs limit orders",
    body:
      "A market order fills immediately at the best available price — fast but unpredictable. A limit order only fills at your chosen price or better — slower but you control the price. Beginners often use limits to avoid surprises.",
    quiz: {
      q: "A limit order…",
      choices: [
        "Only fills at your chosen price or better",
        "Always fills instantly at market price",
        "Costs nothing in commissions",
      ],
      answer: "Only fills at your chosen price or better",
      explain: "Limit = you set the price. Market = you accept whatever's available.",
    },
  },
  {
    id: "diversification",
    title: "Diversification",
    body:
      "Don't put all your eggs in one basket. Spreading money across many stocks, sectors, and asset types reduces risk — if one company crashes, the others can cushion the blow. ETFs are an easy way to instantly diversify.",
    quiz: {
      q: "Diversification mainly helps you…",
      choices: [
        "Reduce risk by spreading investments",
        "Guarantee higher returns",
        "Avoid paying taxes",
      ],
      answer: "Reduce risk by spreading investments",
      explain: "It lowers the impact of any single stock failing.",
    },
  },
  {
    id: "etfs",
    title: "What is an ETF?",
    body:
      "An ETF (Exchange-Traded Fund) is a basket of stocks you can buy as a single ticker. SPY tracks the S&P 500 — one purchase gives you a slice of 500 companies. ETFs are popular for low-cost, instant diversification.",
    quiz: {
      q: "Buying one share of SPY gives you exposure to…",
      choices: [
        "Roughly 500 large US companies",
        "Only one company",
        "All global stock markets",
      ],
      answer: "Roughly 500 large US companies",
      explain: "SPY tracks the S&P 500 — 500 large-cap US stocks in one ticker.",
    },
  },
];

/* ------------------------------ Page state -------------------------------- */

type Mode = "menu" | "lesson" | "result";

const STORAGE_KEY = "learn:basics:v1";
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

export default function LearnBasics() {
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
        title="Learn Stock Market Basics — Beginner Lessons"
        description="Bite-sized beginner lessons on stocks, tickers, bid/ask, market cap, dividends, P/E, bull vs bear markets, order types, diversification, and ETFs."
        path="/learn/basics"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "LearningResource",
          name: "Stock Market Basics",
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
            <span className="font-bold flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> Learn · Basics</span>
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
              Stock market basics
            </h1>
            <p className="text-muted-foreground mt-2 mb-6">
              {LESSONS.length} short lessons, each with a quick quiz. Build the vocabulary every investor needs before reading their first chart.
            </p>

            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              <button
                onClick={() => start(0)}
                className="text-left p-5 rounded-2xl bg-card border-2 border-b-4 border-primary/60 hover:translate-y-[-2px] hover:border-primary transition-all"
              >
                <div className="text-xs uppercase tracking-wider text-primary font-bold mb-1">Start here</div>
                <div className="text-lg font-bold mb-1">Begin from the top</div>
                <div className="text-sm text-muted-foreground">~5 minutes · earn {LESSONS.length * 10} XP</div>
              </button>
              <Link
                to="/learn/patterns"
                className="text-left p-5 rounded-2xl bg-card border-2 border-b-4 hover:translate-y-[-2px] hover:border-foreground/40 transition-all"
              >
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">Next up</div>
                <div className="text-lg font-bold mb-1">Chart patterns →</div>
                <div className="text-sm text-muted-foreground">Once basics click, learn the shapes</div>
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
              {hearts > 0 ? "Basics complete!" : "Out of hearts"}
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
