import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { MyWatchlistWidget } from "@/components/widgets/Widgets";
import { ACADEMY_MODULES, useAcademy, useChecklist } from "@/lib/academy";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  GraduationCap,
  Wallet,
  Star,
  Sparkles,
  X,
  PlayCircle,
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { currentModule, isCompleted, progress, allComplete } = useAcademy();
  const checklist = useChecklist();

  const doneCount = progress.completed.length;
  const totalModules = ACADEMY_MODULES.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="IntegralStocks — Learn Investing with Lessons & a Free Simulator"
        description="A calm, beginner-friendly home for learning stocks. Follow the Investor Academy, track your watchlist, and practice trading with $100,000 of virtual cash."
        path="/dashboard"
      />
      <h1 className="sr-only">IntegralStocks — Beginner investing home</h1>
      <Header onSearch={(s) => navigate(`/stocks/${encodeURIComponent(s.toLowerCase())}`)} />

      <main className="flex-1 w-full max-w-4xl mx-auto px-5 sm:px-8 py-12 sm:py-20 space-y-16">
        {/* Welcome + daily lesson goal */}
        <section className="space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-primary bg-accent px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" /> Welcome back
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05]">
            Today's goal: one small lesson.
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            Investing gets easier the more you show up. Finish today's short module and you'll be a
            little sharper than you were yesterday.
          </p>
        </section>

        {/* First-time checklist */}
        {checklist.visible && (
          <section className="relative rounded-3xl border-2 border-primary/30 bg-primary/5 p-6 sm:p-8">
            <button
              onClick={checklist.dismiss}
              aria-label="Dismiss checklist"
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-background/60 text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-xs font-extrabold uppercase tracking-wider text-primary mb-1">
              Getting started
            </div>
            <h3 className="text-2xl font-extrabold mb-5">Your first three steps</h3>
            <ul className="space-y-2">
              <ChecklistRow
                done={checklist.state.lesson1}
                label="Complete Lesson 1"
                to="/academy"
              />
              <ChecklistRow
                done={checklist.state.addedStock}
                label="Add your first stock"
                to="/stocks"
              />
              <ChecklistRow
                done={checklist.state.firstTrade}
                label="Make your first virtual trade"
                to="/sim"
                onClick={checklist.markTrade}
              />
            </ul>
          </section>
        )}

        {/* Current module + Resume */}
        <section className="rounded-3xl border-2 border-border bg-card p-6 sm:p-10">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-primary mb-2">
            <GraduationCap className="w-3.5 h-3.5" />
            {allComplete ? "Academy complete" : `Module ${currentModule.id} of ${totalModules}`}
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold leading-tight mb-2">
            {allComplete ? "You finished the Academy 🎓" : currentModule.title}
          </h3>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-xl">
            {allComplete
              ? "Keep sharpening: explore the deeper Learn guides or open the Simulator."
              : currentModule.blurb}
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link
              to="/academy"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-primary text-primary-foreground font-extrabold hover:opacity-90 transition-opacity"
            >
              <PlayCircle className="w-5 h-5" />
              {allComplete ? "Review the Academy" : doneCount === 0 ? "Start Lesson" : "Resume Lesson"}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{doneCount}</span> of {totalModules} modules complete
            </div>
          </div>

          {/* Compact module dots */}
          <div className="mt-6 flex gap-2">
            {ACADEMY_MODULES.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex-1 h-1.5 rounded-full",
                  isCompleted(m.id) ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </section>

        {/* Portfolio + Watchlist */}
        <section className="grid md:grid-cols-2 gap-6">
          <Link
            to="/sim"
            className="group rounded-3xl border-2 border-border bg-card p-7 hover:border-primary transition-colors flex flex-col"
          >
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-accent text-primary mb-4">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Paper trading portfolio
            </div>
            <div className="text-3xl font-extrabold mt-1 tabular-nums">$100,000.00</div>
            <div className="text-sm text-muted-foreground mt-1">Virtual starting cash</div>
            <div className="mt-auto pt-5 inline-flex items-center gap-1.5 text-sm font-extrabold text-primary">
              Open simulator
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <div className="rounded-3xl border-2 border-border bg-card p-7 flex flex-col">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-accent text-primary mb-4">
              <Star className="w-5 h-5" />
            </div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              My watchlist
            </div>
            <div className="mt-3 -mx-3">
              <MyWatchlistWidget />
            </div>
            <Link
              to="/watchlist"
              className="mt-auto pt-4 inline-flex items-center gap-1.5 text-sm font-extrabold text-primary"
            >
              Open watchlist <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

const ChecklistRow = ({
  done,
  label,
  to,
  onClick,
}: {
  done: boolean;
  label: string;
  to: string;
  onClick?: () => void;
}) => (
  <li>
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-transparent bg-background/70 hover:border-primary/40 transition-colors",
        done && "opacity-70"
      )}
    >
      {done ? (
        <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
      ) : (
        <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
      )}
      <span className={cn("font-bold flex-1", done && "line-through text-muted-foreground")}>{label}</span>
      <ArrowRight className="w-4 h-4 text-muted-foreground" />
    </Link>
  </li>
);

export default Index;
