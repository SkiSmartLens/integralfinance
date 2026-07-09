import { Link, useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { ACADEMY_MODULES, useAcademy } from "@/lib/academy";
import { ArrowLeft, ArrowRight, CheckCircle2, BookOpen, Target, Lightbulb } from "lucide-react";

const ROADMAPS: Record<number, { title: string; steps: { title: string; body: string }[]; nextAction: { label: string; to: string } }> = {
  1: {
    title: "Deep dive: understanding stock ownership",
    steps: [
      { title: "Companies vs. stocks", body: "A company is the business — offices, products, employees. A stock is a legal claim on a tiny fraction of that business. Owning one share of Coca-Cola literally makes you a co-owner." },
      { title: "Why companies sell shares", body: "Selling shares (going public via an IPO) raises money the company can use to build factories, hire engineers, or pay off debt — without borrowing." },
      { title: "Common vs. preferred shares", body: "Almost everything you'll buy is 'common stock' — it moves in price and sometimes pays dividends. Preferred stock is rarer and behaves more like a bond." },
      { title: "Dividends explained", body: "Some mature companies pay part of their profits back to shareholders every quarter. If Apple pays $1/share and you own 10 shares, you get $10 in cash." },
      { title: "Bull vs. bear markets", body: "A 'bull market' is a long stretch of rising prices; a 'bear market' is a long stretch of falling prices. Both are normal parts of the cycle." },
    ],
    nextAction: { label: "Continue to Reading Charts", to: "/academy/2" },
  },
  2: {
    title: "Deep dive: reading price charts like a pro",
    steps: [
      { title: "Timeframes tell different stories", body: "Zoom to 1D and Apple looks volatile. Zoom to 10Y and it's a beautiful staircase up. Always check multiple timeframes before drawing conclusions." },
      { title: "Volume is the crowd", body: "Volume is the number of shares traded. Big price moves on high volume mean the crowd agrees; big moves on low volume are less reliable." },
      { title: "Moving averages", body: "The 50-day and 200-day moving averages smooth out the noise. Many investors watch when price crosses these lines as a rough trend signal." },
      { title: "Support and resistance", body: "Prices often bounce off levels where lots of buying (support) or selling (resistance) has happened before. Not magic — just crowd psychology." },
      { title: "What NOT to do with charts", body: "Don't over-trade based on tiny wiggles. Don't confuse a pretty pattern for a prediction. Charts describe the past; they don't guarantee the future." },
    ],
    nextAction: { label: "Continue to Your First Trade", to: "/academy/3" },
  },
  3: {
    title: "Deep dive: your first practice trade",
    steps: [
      { title: "Pick a stock you already understand", body: "Do you use Netflix? Buy Amazon packages? Drink Starbucks? Companies you know are easier to follow because you already understand what they sell." },
      { title: "Start tiny", body: "In the simulator, buy just 1–5 shares to start. In real life, that same principle keeps beginners safe: risk what you can afford to lose while you learn." },
      { title: "Set expectations", body: "Even great stocks fall 20% sometimes. If a 10% drop would make you panic-sell, your position is too big or your timeframe is too short." },
      { title: "Journal every trade", body: "Write down WHY you bought and what would make you sell. Reviewing your notes 3 months later is where real learning happens." },
      { title: "Diversify slowly", body: "As you get more comfortable, add 2–3 more stocks in different industries. Owning a bank, a tech company, and a healthcare company smooths out the swings." },
    ],
    nextAction: { label: "Open the Simulator", to: "/sim/lobby" },
  },
};

const AcademyModule = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const modId = Number(id);
  const module = ACADEMY_MODULES.find((m) => m.id === modId);
  const roadmap = ROADMAPS[modId];
  const { complete, isCompleted, isUnlocked } = useAcademy();

  if (!module || !roadmap) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 max-w-2xl mx-auto p-10 text-center">
          <p className="text-muted-foreground">Module not found.</p>
          <Link to="/academy" className="text-primary font-bold">Back to Academy</Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!isUnlocked(modId)) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 max-w-2xl mx-auto p-10 text-center">
          <h1 className="text-2xl font-extrabold mb-2">Locked</h1>
          <p className="text-muted-foreground mb-4">Finish the previous module first to unlock this one.</p>
          <Link to="/academy" className="text-primary font-bold">Back to Academy</Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const done = isCompleted(modId);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title={`${module.title} — Investor Academy | Integral Stocks`} description={module.blurb} path={`/academy/${modId}`} />
      <Header />
      <main className="flex-1 max-w-3xl mx-auto w-full px-5 sm:px-6 py-10 sm:py-14 space-y-10">
        <Link to="/academy" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Academy
        </Link>

        <header className="space-y-3">
          <div className="text-xs font-extrabold uppercase tracking-wider text-primary">Module {module.id} · {module.duration}</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{module.title}</h1>
          <p className="text-muted-foreground text-lg">{module.blurb}</p>
        </header>

        <section className="rounded-3xl border-2 bg-card p-6 sm:p-8 space-y-6">
          <h2 className="flex items-center gap-2 text-xl font-extrabold">
            <BookOpen className="w-5 h-5 text-primary" /> The essentials
          </h2>
          {module.content.map((c) => (
            <div key={c.heading}>
              <h3 className="font-extrabold text-base mb-1">{c.heading}</h3>
              <p className="text-muted-foreground leading-relaxed">{c.body}</p>
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-xl font-extrabold">
            <Target className="w-5 h-5 text-primary" /> {roadmap.title}
          </h2>
          <ol className="space-y-3">
            {roadmap.steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl border-2 bg-card p-5 flex gap-4">
                <div className="shrink-0 w-9 h-9 rounded-full bg-primary text-primary-foreground font-extrabold flex items-center justify-center">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-extrabold">{s.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mt-1">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-3xl bg-primary/5 border-2 border-primary/30 p-6 flex items-start gap-4">
          <Lightbulb className="w-6 h-6 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-extrabold">Ready to move on?</div>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Mark this module complete when you feel confident with the ideas above.
            </p>
            <div className="flex flex-wrap gap-3">
              {!done && (
                <button
                  onClick={() => { complete(modId); }}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground font-extrabold"
                >
                  Mark complete <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => nav(roadmap.nextAction.to)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full border-2 border-primary text-primary font-extrabold hover:bg-accent"
              >
                {roadmap.nextAction.label} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
};

export default AcademyModule;
