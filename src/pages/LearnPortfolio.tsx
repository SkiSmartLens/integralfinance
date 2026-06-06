import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { cn } from "@/lib/utils";
import { Heart, Flame, Star, Check, X, ArrowRight, Trophy, RotateCcw, Briefcase } from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  body: string;
  quiz: { q: string; choices: string[]; answer: string; explain: string };
}

const LESSONS: Lesson[] = [
  {
    id: "diversification",
    title: "What Is Diversification?",
    body: "Diversification means spreading your money across many different investments so one bad pick doesn't ruin you. The classic advice: 'Don't put all your eggs in one basket.' If you own 30 stocks across different sectors, a single company going bankrupt only costs you a small fraction of your portfolio. Diversification doesn't eliminate risk — it reduces unsystematic (company-specific) risk. Market-wide crashes still hurt everyone.",
    quiz: { q: "What type of risk does diversification primarily reduce?", choices: ["Unsystematic (company-specific) risk", "Market-wide risk", "Inflation risk", "Interest rate risk"], answer: "Unsystematic (company-specific) risk", explain: "Diversification helps with company-specific risk, but can't protect against broad market crashes." },
  },
  {
    id: "dca",
    title: "Dollar-Cost Averaging",
    body: "Dollar-cost averaging (DCA) means investing a fixed dollar amount at regular intervals — say $100 every month — regardless of market conditions. When prices are high, you buy fewer shares. When prices are low, you buy more. Over time, this averages out your cost per share and removes the impossible task of timing the market perfectly. DCA is one of the simplest and most effective long-term strategies, especially for beginners.",
    quiz: { q: "What is the main benefit of dollar-cost averaging?", choices: ["It removes the need to time the market perfectly", "It guarantees profits", "It only works in bull markets", "It eliminates all investment risk"], answer: "It removes the need to time the market perfectly", explain: "DCA takes emotion out of investing by automatically buying at regular intervals regardless of price." },
  },
  {
    id: "growth-value",
    title: "Growth vs. Value Investing",
    body: "Growth investing means buying companies expected to grow faster than average — often tech companies with high P/E ratios. You're paying a premium for future potential. Value investing means finding companies trading below their intrinsic value — stocks the market has overlooked or unfairly punished. Warren Buffett is the most famous value investor. Growth stocks tend to perform better in bull markets; value stocks often hold up better in downturns.",
    quiz: { q: "Which investing style focuses on finding undervalued companies?", choices: ["Value investing", "Growth investing", "Momentum investing", "Index investing"], answer: "Value investing", explain: "Value investors look for companies trading below their intrinsic worth — buying $1 of value for $0.70." },
  },
  {
    id: "asset-allocation",
    title: "What Is Asset Allocation?",
    body: "Asset allocation means deciding how to split your portfolio between different asset classes: stocks, bonds, cash, real estate, etc. A classic rule: subtract your age from 110 to get your stock percentage. A 25-year-old might do 85% stocks, 15% bonds. A 60-year-old might flip that. Stocks offer higher returns but more volatility. Bonds are more stable but grow slower. Your allocation should match your time horizon and risk tolerance.",
    quiz: { q: "Why do older investors typically hold more bonds than younger investors?", choices: ["They have less time to recover from market drops", "Bonds always outperform stocks", "They pay lower taxes on bonds", "Bonds have higher returns than stocks"], answer: "They have less time to recover from market drops", explain: "Younger investors can ride out market crashes. Older investors near retirement can't afford big drops." },
  },
  {
    id: "evaluate-stock",
    title: "How to Evaluate a Stock",
    body: "Before buying any stock, ask: (1) Is the business growing revenue and earnings? (2) Is it profitable? Check the net margin. (3) Is the valuation reasonable? Compare P/E to industry peers. (4) Does it have a competitive advantage (moat)? (5) Is the management trustworthy? Key metrics: P/E ratio, EPS growth rate, debt-to-equity ratio, free cash flow, and return on equity (ROE). Never buy a stock just because it's popular.",
    quiz: { q: "What is a 'moat' in investing?", choices: ["A company's durable competitive advantage", "A technical chart pattern", "A type of bond", "A government regulation"], answer: "A company's durable competitive advantage", explain: "Buffett coined the 'economic moat' — a sustainable edge that protects profits from competitors." },
  },
  {
    id: "risk-tolerance",
    title: "Understanding Risk Tolerance",
    body: "Risk tolerance is how much market volatility you can stomach without panicking and selling. It has two parts: your ability to take risk (time horizon, income stability) and your willingness to take risk (emotional comfort with losses). Someone who checks their portfolio every day and loses sleep over red days has low risk tolerance. Overestimating your risk tolerance is one of the most expensive mistakes new investors make — they buy aggressive portfolios then sell at the bottom.",
    quiz: { q: "What is the most expensive mistake new investors make regarding risk tolerance?", choices: ["Overestimating it and selling at market bottoms", "Underestimating it and missing gains", "Not checking their portfolio enough", "Investing in bonds too early"], answer: "Overestimating it and selling at market bottoms", explain: "People think they can handle volatility until they experience it. Panic selling at the bottom locks in losses." },
  },
  {
    id: "rebalancing",
    title: "Rebalancing Your Portfolio",
    body: "Over time, your portfolio drifts from its target allocation. If stocks boom, your stock percentage grows too large. Rebalancing means periodically selling winners and buying laggards to restore your target mix. Most investors rebalance once a year or when an asset class drifts more than 5% from its target. Rebalancing forces you to 'sell high, buy low' systematically — the opposite of what emotions tell you to do.",
    quiz: { q: "What does rebalancing force you to do automatically?", choices: ["Sell high and buy low", "Buy more of your winners", "Hold only cash during downturns", "Avoid taxes"], answer: "Sell high and buy low", explain: "When you rebalance, you trim overweight winners (sell high) and add to underweight laggards (buy low)." },
  },
  {
    id: "tax-accounts",
    title: "Tax-Advantaged Accounts",
    body: "The government incentivizes investing through special accounts. A 401(k) lets you invest pre-tax dollars — you don't pay taxes until you withdraw in retirement. A Roth IRA lets you invest after-tax dollars — but all growth and withdrawals are tax-free. A traditional IRA is like a 401(k) but individual. Maxing these accounts before investing in a regular brokerage account is almost always the right move because of the massive long-term tax savings.",
    quiz: { q: "What is the key advantage of a Roth IRA?", choices: ["Tax-free growth and tax-free withdrawals in retirement", "Tax deduction on contributions", "No contribution limits", "Employer matching"], answer: "Tax-free growth and tax-free withdrawals in retirement", explain: "With a Roth IRA, you pay taxes now but never again on that money — a huge advantage over decades." },
  },
  {
    id: "long-term",
    title: "Building a Long-Term Strategy",
    body: "The most powerful force in investing is compound growth over time. $10,000 invested at 10% annual returns becomes $174,000 in 30 years. The keys: start early, invest consistently, keep costs low (use index ETFs), diversify, and never panic sell. Most professional fund managers underperform the S&P 500 over 10+ years. The boring strategy — buy diversified index funds and hold forever — beats almost everyone. Your biggest enemy is your own emotions.",
    quiz: { q: "What is the most powerful force in long-term investing?", choices: ["Compound growth over time", "Stock picking", "Market timing", "Short-term trading"], answer: "Compound growth over time", explain: "Einstein allegedly called compound interest the eighth wonder of the world. Time in the market beats timing the market." },
  },
];

const STORAGE_KEY = "learnPortfolio_stats";
type Stats = { xp: number; streak: number; mastered: string[] };
const defaultStats = (): Stats => ({ xp: 0, streak: 0, mastered: [] });
const loadStats = (): Stats => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") ?? defaultStats(); } catch { return defaultStats(); } };
const saveStats = (s: Stats) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} };

export default function LearnPortfolio() {
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
      setTimeout(() => { if (idx + 1 < LESSONS.length) { setIdx(idx + 1); setPhase("read"); setPicked(null); } else setMode("result"); }, 1200);
    } else {
      setHearts((h) => { const next = h - 1; if (next <= 0) setTimeout(() => setMode("result"), 1000); return next; });
    }
  };
  const progress = useMemo(() => { if (mode !== "lesson") return 0; return ((idx + (phase === "quiz" ? 0.5 : 0)) / LESSONS.length) * 100; }, [mode, idx, phase]);

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Building a Portfolio — Integral Stocks" description="Learn diversification, dollar-cost averaging, asset allocation, and long-term investing strategy." path="/learn/portfolio" />
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Link to="/learn" className="text-sm text-muted-foreground hover:text-foreground">← Learn</Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-bold flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-blue-500" /> Building a Portfolio</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-bold">
            <span className="flex items-center gap-1 text-orange-500"><Flame className="w-4 h-4 fill-orange-500" /> {stats.streak}</span>
            <span className="flex items-center gap-1 text-yellow-500"><Star className="w-4 h-4 fill-yellow-500" /> {stats.xp} XP</span>
            {mode === "lesson" && phase === "quiz" && (
              <span className="flex items-center gap-0.5">{Array.from({ length: 3 }).map((_, i) => <Heart key={i} className={cn("w-4 h-4", i < hearts ? "fill-red-500 text-red-500" : "text-muted-foreground/40")} />)}</span>
            )}
          </div>
        </div>
        {mode === "lesson" && <div className="h-2 bg-muted rounded-full overflow-hidden mb-6"><div className="h-full bg-gradient-to-r from-blue-500 to-primary transition-all duration-500" style={{ width: `${progress}%` }} /></div>}
        {mode === "menu" && (
          <>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Building a Portfolio</h1>
            <p className="text-muted-foreground mt-2 mb-6">{LESSONS.length} lessons on diversification, strategy, and long-term wealth building.</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              <button onClick={() => start(0)} className="text-left p-5 rounded-2xl bg-card border-2 border-b-4 border-blue-500/60 hover:translate-y-[-2px] hover:border-blue-500 transition-all">
                <div className="text-xs uppercase tracking-wider text-blue-500 font-bold mb-1">Start here</div>
                <div className="text-lg font-bold mb-1">Begin from the top</div>
                <div className="text-sm text-muted-foreground">~{LESSONS.length * 8} min · earn {LESSONS.length * 10} XP</div>
              </button>
              <Link to="/learn/advanced" className="text-left p-5 rounded-2xl bg-card border-2 border-b-4 hover:translate-y-[-2px] hover:border-foreground/40 transition-all">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">Next up</div>
                <div className="text-lg font-bold mb-1">Advanced Strategies →</div>
                <div className="text-sm text-muted-foreground">Options, short selling, and pro tactics</div>
              </Link>
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">All lessons</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {LESSONS.map((l, i) => {
                const done = stats.mastered.includes(l.id);
                return (
                  <button key={l.id} onClick={() => start(i)} className="text-left p-3 rounded-xl bg-card border hover:border-blue-500/60 transition-colors">
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
              <button onClick={() => setPhase("quiz")} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground border-2 border-b-4 border-primary font-bold text-sm flex items-center gap-1.5 hover:opacity-90">Quick check <ArrowRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
        {mode === "lesson" && phase === "quiz" && lesson && (
          <div className="bg-card border-2 border-b-4 rounded-2xl p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">Quick check · Lesson {idx + 1}</div>
            <h2 className="text-xl font-extrabold mb-5">{lesson.quiz.q}</h2>
            <div className="grid gap-2">
              {lesson.quiz.choices.map((c) => {
                const isCorrect = c === lesson.quiz.answer; const isPicked = picked === c;
                return <button key={c} onClick={() => answer(c)} disabled={picked != null} className={cn("p-3 rounded-xl border-2 border-b-4 font-semibold text-sm text-left transition-colors", picked == null && "hover:border-primary/60", picked != null && isCorrect && "bg-up/15 border-up text-up", picked != null && isPicked && !isCorrect && "bg-down/15 border-down text-down", picked != null && !isPicked && !isCorrect && "opacity-50")}><span className="inline-flex items-center gap-2">{picked != null && isCorrect && <Check className="w-4 h-4" />}{picked != null && isPicked && !isCorrect && <X className="w-4 h-4" />}{c}</span></button>;
              })}
            </div>
            {picked != null && <p className="mt-4 text-sm text-muted-foreground italic">{lesson.quiz.explain}</p>}
          </div>
        )}
        {mode === "result" && (
          <div className="bg-card border-2 border-b-4 rounded-2xl p-8 text-center">
            <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-3" />
            <h2 className="text-2xl font-extrabold mb-1">{hearts > 0 ? "Track complete!" : "Out of hearts"}</h2>
            <p className="text-muted-foreground mb-5">You got <span className="font-bold text-foreground">{correctCount}</span> of <span className="font-bold text-foreground">{LESSONS.length}</span> correct · <span className="text-yellow-500 font-bold">+{correctCount * 10} XP</span></p>
            <div className="flex justify-center gap-2 flex-wrap">
              <button onClick={() => start(0)} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground border-2 border-b-4 border-primary font-bold text-sm flex items-center gap-1.5"><RotateCcw className="w-4 h-4" /> Try again</button>
              <Link to="/learn/advanced" className="px-5 py-2.5 rounded-xl border-2 border-b-4 font-bold text-sm">Next: Advanced →</Link>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
