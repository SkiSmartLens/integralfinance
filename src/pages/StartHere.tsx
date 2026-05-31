import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { cn } from "@/lib/utils";
import { ArrowRight, Sparkles } from "lucide-react";

type Level = "newbie" | "basics";
type Goal = "learn" | "practice" | "follow";

const LEVELS: { id: Level; emoji: string; title: string; sub: string }[] = [
  { id: "newbie", emoji: "🟢", title: "Total Newbie", sub: "I've never heard of a stock" },
  { id: "basics", emoji: "🟡", title: "Some Basics", sub: "I know what stocks are, but not much more" },
];

const GOALS: { id: Goal; emoji: string; title: string; sub: string }[] = [
  { id: "learn", emoji: "📚", title: "I want to learn", sub: "Teach me the basics, step by step" },
  { id: "practice", emoji: "📈", title: "I want to practice trading", sub: "Let me try it with fake money" },
  { id: "follow", emoji: "👀", title: "I want to follow the market", sub: "Show me what's moving today" },
];

function getRecommendation(level: Level, goal: Goal): { text: string; cta: string; to: string } {
  const recs: Record<string, { text: string; cta: string; to: string }> = {
    "newbie:learn": { text: "Perfect starting point. Begin with our 5-minute intro guide — zero jargon, promise.", cta: "Start the intro guide", to: "/learn/basics" },
    "newbie:practice": { text: "Bold move! Read the 2-minute quick start, then jump in with $100,000 of fake money.", cta: "Open the Simulator", to: "/simulator" },
    "newbie:follow": { text: "Great — start by watching the market on the dashboard. Tap any stock for a plain-English explainer.", cta: "Open the dashboard", to: "/stocks" },
    "basics:learn": { text: "Level up with our chart patterns and indicators lessons.", cta: "See the lessons", to: "/learn/patterns" },
    "basics:practice": { text: "You're ready. Jump into the simulator with $100,000 of practice money and test a strategy.", cta: "Open the Simulator", to: "/simulator" },
    "basics:follow": { text: "Dive into the live dashboard, build a watchlist, and get AI insights on why stocks move.", cta: "Open the dashboard", to: "/stocks" },
  };
  return recs[`${level}:${goal}`];
}

const Card = ({
  active, emoji, title, sub, onClick,
}: { active: boolean; emoji: string; title: string; sub: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full text-left rounded-2xl border-2 p-5 flex items-center gap-4 transition-all active:scale-[0.98]",
      active
        ? "border-primary bg-accent shadow-lg shadow-primary/10"
        : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
    )}
  >
    <span className="text-3xl shrink-0">{emoji}</span>
    <span className="min-w-0">
      <span className="block font-extrabold text-lg leading-tight">{title}</span>
      <span className="block text-sm text-muted-foreground">{sub}</span>
    </span>
  </button>
);

const StartHere = () => {
  const [level, setLevel] = useState<Level | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);

  const rec = level && goal ? getRecommendation(level, goal) : null;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Start Here — Learn to Invest as a Teen | IntegralStocks"
        description="New to investing? Pick your level and goal to get a personalized starting path. Learn the basics, practice with fake money, or follow the market — all free."
        path="/start"
      />
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary bg-accent px-3 py-1 rounded-full mb-3">
            <Sparkles className="w-3.5 h-3.5" /> 2 quick taps
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Where are you starting from?</h1>
          <p className="text-muted-foreground mt-2">No money or bank account needed. Let's find your path.</p>
        </div>

        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Step 1 — How much do you know?
          </h2>
          <div className="space-y-3">
            {LEVELS.map((l) => (
              <Card key={l.id} active={level === l.id} emoji={l.emoji} title={l.title} sub={l.sub} onClick={() => setLevel(l.id)} />
            ))}
          </div>
        </section>

        <section className={cn("mb-8 transition-opacity", !level && "opacity-40 pointer-events-none")}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Step 2 — What's your goal?
          </h2>
          <div className="space-y-3">
            {GOALS.map((g) => (
              <Card key={g.id} active={goal === g.id} emoji={g.emoji} title={g.title} sub={g.sub} onClick={() => setGoal(g.id)} />
            ))}
          </div>
        </section>

        {rec && (
          <section className="rounded-2xl border-2 border-primary bg-gradient-to-br from-accent to-card p-6 text-center animate-in fade-in slide-in-from-bottom-2">
            <div className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Your path</div>
            <p className="text-lg font-bold mb-5">{rec.text}</p>
            <Link
              to={rec.to}
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 rounded-full bg-primary text-primary-foreground font-extrabold text-lg hover:opacity-90 transition-opacity"
            >
              {rec.cta} <ArrowRight className="w-5 h-5" />
            </Link>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default StartHere;
