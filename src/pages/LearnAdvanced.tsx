import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { cn } from "@/lib/utils";
import { Heart, Flame, Star, Check, X, ArrowRight, Trophy, RotateCcw, Rocket } from "lucide-react";

interface Lesson { id: string; title: string; body: string; quiz: { q: string; choices: string[]; answer: string; explain: string }; }

const LESSONS: Lesson[] = [
  { id: "options", title: "What Are Options?", body: "Options are contracts that give you the right — but not the obligation — to buy or sell a stock at a specific price before a set date. A call option gives you the right to buy. A put option gives you the right to sell. Options can be used to speculate (bet on price moves with leverage) or hedge (protect an existing position). Key terms: strike price (the price in the contract), expiration date, and premium (what you pay for the option). Options can expire worthless, meaning you lose your entire premium.", quiz: { q: "What does a call option give you the right to do?", choices: ["Buy shares at the strike price", "Sell shares at the strike price", "Borrow shares to short", "Receive a dividend"], answer: "Buy shares at the strike price", explain: "Call = right to buy. Put = right to sell. You pay a premium for this right." } },
  { id: "short-selling", title: "Short Selling Explained", body: "Short selling lets you profit when a stock falls. You borrow shares from your broker and sell them immediately. Later, you buy them back (hopefully cheaper) and return them, pocketing the difference. Risk: if the stock rises instead of falls, your losses are theoretically unlimited — the stock can keep going up forever. Short selling requires a margin account and is only for experienced investors. Famous short seller: Michael Burry, who shorted the housing market before 2008.", quiz: { q: "What is the main risk of short selling?", choices: ["Losses are theoretically unlimited if the stock rises", "You can only lose your initial investment", "The broker can charge high dividends", "You pay double taxes"], answer: "Losses are theoretically unlimited if the stock rises", explain: "A long position can only drop to zero. A short position can theoretically lose forever as the stock rises." } },
  { id: "futures", title: "Understanding Futures", body: "Futures are contracts to buy or sell an asset at a predetermined price on a specific future date. Unlike options, futures are obligations — both parties must fulfill the contract. Futures are used by farmers to lock in crop prices, by airlines to lock in fuel costs, and by traders to speculate on commodities and indexes. The S&P 500 futures market trades nearly 24 hours a day and is used to gauge where the stock market will open each morning.", quiz: { q: "Unlike options, futures contracts are:", choices: ["Obligations — both parties must fulfill them", "Rights with no obligation", "Only available for stocks", "Risk-free instruments"], answer: "Obligations — both parties must fulfill them", explain: "Options give you the right. Futures give you the obligation. Big difference in risk profile." } },
  { id: "etf-vs-mutual", title: "ETFs vs. Mutual Funds", body: "Both ETFs and mutual funds pool money from many investors to buy a basket of securities. Key differences: ETFs trade on exchanges throughout the day like stocks; mutual funds only trade once daily at closing price. ETFs typically have lower expense ratios. Most mutual funds are actively managed (a manager picks stocks), while most ETFs passively track an index. Studies show most active mutual fund managers underperform their benchmark index over 10+ years.", quiz: { q: "What is the main trading difference between ETFs and mutual funds?", choices: ["ETFs trade throughout the day; mutual funds only once daily", "Mutual funds trade 24 hours; ETFs only once daily", "Both trade the same way", "ETFs can only be bought at IPO"], answer: "ETFs trade throughout the day; mutual funds only once daily", explain: "ETFs are like stocks — buy and sell anytime during market hours. Mutual funds price once at market close." } },
  { id: "margin", title: "Margin Trading Explained", body: "Margin trading means borrowing money from your broker to buy more stock than you could with your own cash. If you have $10,000 and use 2:1 margin, you can buy $20,000 in stocks. Gains are amplified — but so are losses. If your holdings drop enough, you get a 'margin call' requiring you to deposit more money or sell immediately, often at the worst time. Margin interest accrues daily. Margin trading is how many investors wipe out their accounts — use it only if you truly understand the risks.", quiz: { q: "What is a margin call?", choices: ["A demand from your broker to deposit more money or sell positions", "A notification that your options expired", "A dividend payment from a margin account", "A broker fee for trading"], answer: "A demand from your broker to deposit more money or sell positions", explain: "When your margin account drops below the maintenance requirement, the broker demands more collateral — often at the worst time." } },
  { id: "technical", title: "Technical Analysis Basics", body: "Technical analysis is the study of price and volume charts to predict future price movements. Unlike fundamental analysis (which studies the business), technical analysis only looks at the chart. Key concepts: trend lines, support/resistance, moving averages, RSI (Relative Strength Index — measures overbought/oversold), MACD (Moving Average Convergence Divergence — trend momentum), and Bollinger Bands (volatility indicator). Technical analysis is widely used but controversial — critics argue past prices don't reliably predict future prices.", quiz: { q: "What does RSI measure?", choices: ["Whether a stock is overbought or oversold", "A company's revenue growth", "The P/E ratio relative to peers", "Daily trading volume"], answer: "Whether a stock is overbought or oversold", explain: "RSI ranges from 0-100. Above 70 = overbought (may fall). Below 30 = oversold (may rise)." } },
  { id: "fundamental", title: "Fundamental Analysis Deep Dive", body: "Fundamental analysis means evaluating a company's financial health to determine its intrinsic value. Key documents: income statement (revenue, expenses, profit), balance sheet (assets, liabilities, equity), and cash flow statement. Key ratios: P/E, P/B (price to book), EV/EBITDA, debt-to-equity, current ratio, return on equity (ROE), and free cash flow yield. The goal: find companies worth more than their current stock price. If intrinsic value > market price, the stock may be undervalued.", quiz: { q: "What is the goal of fundamental analysis?", choices: ["Find companies worth more than their current stock price", "Predict short-term price movements", "Identify chart patterns", "Find stocks with high trading volume"], answer: "Find companies worth more than their current stock price", explain: "Fundamental analysis seeks to find the gap between intrinsic value and market price — that gap is the opportunity." } },
  { id: "sectors", title: "Sector Investing", body: "The stock market is divided into 11 sectors: Technology, Healthcare, Financials, Consumer Discretionary, Consumer Staples, Industrials, Energy, Utilities, Real Estate, Materials, and Communication Services. Different sectors perform well in different economic environments. Tech and Consumer Discretionary thrive when the economy grows. Utilities and Consumer Staples hold up in recessions. Sector ETFs (like XLK for Tech, XLV for Healthcare) let you bet on specific sectors without picking individual stocks.", quiz: { q: "Which sectors typically hold up best during economic recessions?", choices: ["Utilities and Consumer Staples", "Technology and Consumer Discretionary", "Energy and Materials", "Financials and Real Estate"], answer: "Utilities and Consumer Staples", explain: "People still pay electric bills and buy food during recessions — making these 'defensive' sectors." } },
  { id: "dividend-strategy", title: "Dividend Investing Strategy", body: "Dividend investing focuses on buying stocks that pay regular cash dividends. Key metrics: dividend yield (annual dividend ÷ stock price), payout ratio (dividends ÷ earnings — under 60% is healthy), and dividend growth rate. 'Dividend aristocrats' are S&P 500 companies that have raised their dividend every year for 25+ years. Reinvesting dividends (DRIP) compounds returns powerfully over time. Caveat: a very high yield (8%+) is often a warning sign that the dividend may be cut.", quiz: { q: "What does a very high dividend yield (8%+) often signal?", choices: ["The dividend may be at risk of being cut", "The stock is a great buy immediately", "The company is growing very fast", "Low market risk"], answer: "The dividend may be at risk of being cut", explain: "High yields often mean the stock price has fallen sharply — possibly because the market expects a dividend cut." } },
  { id: "hedge-funds", title: "How Hedge Funds Work", body: "Hedge funds are private investment funds for wealthy investors (typically $1M+ minimum) that use sophisticated strategies — long/short positions, leverage, derivatives, arbitrage — to try to profit in any market condition. They charge '2 and 20': a 2% management fee and 20% of profits. Despite their mystique, most hedge funds underperform simple S&P 500 index funds after fees. Warren Buffett famously won a $1 million bet that an index fund would beat a basket of hedge funds over 10 years.", quiz: { q: "What does '2 and 20' mean in hedge fund fees?", choices: ["2% management fee and 20% of profits", "2% profit and 20% loss protection", "$2 per trade and $20 per withdrawal", "2x leverage and 20% margin requirement"], answer: "2% management fee and 20% of profits", explain: "These high fees make it very hard for hedge funds to outperform simple, low-cost index funds." } },
  { id: "income-statement", title: "Reading an Income Statement", body: "The income statement (P&L) shows a company's revenues, expenses, and profit over a period. Top line: Revenue (total sales). Then subtract Cost of Goods Sold = Gross Profit. Subtract operating expenses = Operating Income (EBIT). Subtract interest and taxes = Net Income (bottom line). EPS = Net Income ÷ shares outstanding. Key things to watch: Is revenue growing? Are margins expanding or shrinking? Is net income growing faster than revenue? One-time charges can distort the picture — look at operating income for the true business performance.", quiz: { q: "What is the 'bottom line' on an income statement?", choices: ["Net income after all expenses and taxes", "Total revenue", "Gross profit", "Operating income"], answer: "Net income after all expenses and taxes", explain: "The 'bottom line' literally means the last line — net income after subtracting all costs, interest, and taxes." } },
  { id: "balance-sheet", title: "Reading a Balance Sheet", body: "The balance sheet is a snapshot of what a company owns (assets), owes (liabilities), and the difference (equity) at a single point in time. The fundamental equation: Assets = Liabilities + Equity. Current assets (cash, receivables) vs. long-term assets (property, equipment). Current liabilities (due within 1 year) vs. long-term debt. Key ratios from the balance sheet: debt-to-equity (financial leverage), current ratio (current assets ÷ current liabilities — above 1.5 is healthy), and book value per share.", quiz: { q: "What is the fundamental balance sheet equation?", choices: ["Assets = Liabilities + Equity", "Revenue = Expenses + Profit", "Assets = Revenue - Costs", "Equity = Assets + Liabilities"], answer: "Assets = Liabilities + Equity", explain: "Everything a company owns was financed either by borrowing (liabilities) or owner investment (equity)." } },
];

const STORAGE_KEY = "learnAdvanced_stats";
type Stats = { xp: number; streak: number; mastered: string[] };
const defaultStats = (): Stats => ({ xp: 0, streak: 0, mastered: [] });
const loadStats = (): Stats => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") ?? defaultStats(); } catch { return defaultStats(); } };
const saveStats = (s: Stats) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} };

export default function LearnAdvanced() {
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState<Stats>(loadStats);
  const [mode, setMode] = useState<"menu" | "lesson" | "result">(() => { const id = searchParams.get("lesson"); return id ? "lesson" : "menu"; });
  const [idx, setIdx] = useState(() => { const id = searchParams.get("lesson"); if (!id) return 0; const i = LESSONS.findIndex((l) => l.id === id); return i >= 0 ? i : 0; });
  const [phase, setPhase] = useState<"read" | "quiz">("read");
  const [picked, setPicked] = useState<string | null>(null);
  const [hearts, setHearts] = useState(3);
  const [correctCount, setCorrectCount] = useState(0);
  const lesson = LESSONS[idx];
  const start = (i: number) => { setIdx(i); setPhase("read"); setPicked(null); setHearts(3); setCorrectCount(0); setMode("lesson"); };
  const answer = (c: string) => {
    if (picked) return; setPicked(c);
    const correct = c === lesson.quiz.answer;
    if (correct) {
      setCorrectCount((n) => n + 1);
      const newStats = { ...stats, xp: stats.xp + 10, mastered: stats.mastered.includes(lesson.id) ? stats.mastered : [...stats.mastered, lesson.id] };
      setStats(newStats); saveStats(newStats);
      setTimeout(() => { if (idx + 1 < LESSONS.length) { setIdx(idx + 1); setPhase("read"); setPicked(null); } else setMode("result"); }, 1200);
    } else { setHearts((h) => { const next = h - 1; if (next <= 0) setTimeout(() => setMode("result"), 1000); return next; }); }
  };
  const progress = useMemo(() => { if (mode !== "lesson") return 0; return ((idx + (phase === "quiz" ? 0.5 : 0)) / LESSONS.length) * 100; }, [mode, idx, phase]);

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Advanced Strategies — Integral Stocks" description="Learn options, short selling, margin trading, technical and fundamental analysis, and pro investing tactics." path="/learn/advanced" />
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Link to="/learn" className="text-sm text-muted-foreground hover:text-foreground">← Learn</Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-bold flex items-center gap-1.5"><Rocket className="w-4 h-4 text-purple-500" /> Advanced Strategies</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-bold">
            <span className="flex items-center gap-1 text-orange-500"><Flame className="w-4 h-4 fill-orange-500" /> {stats.streak}</span>
            <span className="flex items-center gap-1 text-yellow-500"><Star className="w-4 h-4 fill-yellow-500" /> {stats.xp} XP</span>
            {mode === "lesson" && phase === "quiz" && <span className="flex items-center gap-0.5">{Array.from({ length: 3 }).map((_, i) => <Heart key={i} className={cn("w-4 h-4", i < hearts ? "fill-red-500 text-red-500" : "text-muted-foreground/40")} />)}</span>}
          </div>
        </div>
        {mode === "lesson" && <div className="h-2 bg-muted rounded-full overflow-hidden mb-6"><div className="h-full bg-gradient-to-r from-purple-500 to-primary transition-all duration-500" style={{ width: `${progress}%` }} /></div>}
        {mode === "menu" && (
          <>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Advanced Strategies</h1>
            <p className="text-muted-foreground mt-2 mb-6">{LESSONS.length} lessons on options, short selling, margin, and pro-level analysis.</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              <button onClick={() => start(0)} className="text-left p-5 rounded-2xl bg-card border-2 border-b-4 border-purple-500/60 hover:translate-y-[-2px] hover:border-purple-500 transition-all">
                <div className="text-xs uppercase tracking-wider text-purple-500 font-bold mb-1">Start here</div>
                <div className="text-lg font-bold mb-1">Begin from the top</div>
                <div className="text-sm text-muted-foreground">~{LESSONS.length * 10} min · earn {LESSONS.length * 10} XP</div>
              </button>
              <Link to="/learn" className="text-left p-5 rounded-2xl bg-card border-2 border-b-4 hover:translate-y-[-2px] hover:border-foreground/40 transition-all">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">All tracks</div>
                <div className="text-lg font-bold mb-1">← Back to Learn hub</div>
                <div className="text-sm text-muted-foreground">Browse all 4 learning tracks</div>
              </Link>
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">All lessons</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {LESSONS.map((l, i) => { const done = stats.mastered.includes(l.id); return (
                <button key={l.id} onClick={() => start(i)} className="text-left p-3 rounded-xl bg-card border hover:border-purple-500/60 transition-colors">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                    <div className="font-bold truncate">{l.title}</div>
                    {done && <Check className="w-3.5 h-3.5 text-up shrink-0 ml-auto" />}
                  </div>
                </button>
              ); })}
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
              {lesson.quiz.choices.map((c) => { const isCorrect = c === lesson.quiz.answer; const isPicked = picked === c; return <button key={c} onClick={() => answer(c)} disabled={picked != null} className={cn("p-3 rounded-xl border-2 border-b-4 font-semibold text-sm text-left transition-colors", picked == null && "hover:border-primary/60", picked != null && isCorrect && "bg-up/15 border-up text-up", picked != null && isPicked && !isCorrect && "bg-down/15 border-down text-down", picked != null && !isPicked && !isCorrect && "opacity-50")}><span className="inline-flex items-center gap-2">{picked != null && isCorrect && <Check className="w-4 h-4" />}{picked != null && isPicked && !isCorrect && <X className="w-4 h-4" />}{c}</span></button>; })}
            </div>
            {picked != null && <p className="mt-4 text-sm text-muted-foreground italic">{lesson.quiz.explain}</p>}
          </div>
        )}
        {mode === "result" && (
          <div className="bg-card border-2 border-b-4 rounded-2xl p-8 text-center">
            <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-3" />
            <h2 className="text-2xl font-extrabold mb-1">{hearts > 0 ? "Advanced complete! 🎓" : "Out of hearts"}</h2>
            <p className="text-muted-foreground mb-5">You got <span className="font-bold text-foreground">{correctCount}</span> of <span className="font-bold text-foreground">{LESSONS.length}</span> correct · <span className="text-yellow-500 font-bold">+{correctCount * 10} XP</span></p>
            <div className="flex justify-center gap-2 flex-wrap">
              <button onClick={() => start(0)} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground border-2 border-b-4 border-primary font-bold text-sm flex items-center gap-1.5"><RotateCcw className="w-4 h-4" /> Try again</button>
              <Link to="/learn" className="px-5 py-2.5 rounded-xl border-2 border-b-4 font-bold text-sm">← All Tracks</Link>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
