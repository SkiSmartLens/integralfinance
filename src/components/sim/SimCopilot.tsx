import { useMemo } from "react";
import { Sparkles, AlertTriangle, ShieldCheck, Info, GraduationCap } from "lucide-react";
import { Holding } from "@/components/sim/HoldingsPanel";
import { cn } from "@/lib/utils";

interface Tip {
  id: string;
  tone: "info" | "warn" | "good";
  icon: JSX.Element;
  title: string;
  body: string;
}

interface Props {
  cash: number;
  startingCash: number;
  equity: number;
  holdings: Holding[];
  selected: string;
  selectedChangePct?: number;
}

/**
 * Rule-based educational advisor. Runs client-side, no AI call needed for
 * the base tips — keeps the sim page instant. Each nudge maps to a real,
 * teachable pattern so beginners see WHY it matters.
 */
export const SimCopilot = ({ cash, startingCash, equity, holdings, selected, selectedChangePct }: Props) => {
  const tips = useMemo<Tip[]>(() => {
    const out: Tip[] = [];
    const invested = equity - cash;

    // First trade nudge
    if (holdings.length === 0) {
      out.push({
        id: "first",
        tone: "info",
        icon: <GraduationCap className="w-4 h-4" />,
        title: "Welcome — try your first paper trade",
        body: "Pick any stock, buy a small amount, and watch it move. Nothing here uses real money. It's the fastest way to feel how the market works.",
      });
    }

    // Concentration risk
    const positionValue = holdings.map((h) => ({ sym: h.symbol, val: h.last * h.shares }));
    const biggest = positionValue.sort((a, b) => b.val - a.val)[0];
    if (biggest && equity > 0 && biggest.val / equity > 0.4) {
      out.push({
        id: "concentration",
        tone: "warn",
        icon: <AlertTriangle className="w-4 h-4" />,
        title: `${biggest.sym} is over 40% of your portfolio`,
        body: "Diversifying across 5–10 different stocks or sectors smooths out the swings. Consider trimming and spreading the cash into other companies you understand.",
      });
    }

    // All cash sitting idle
    if (holdings.length === 0 && cash === startingCash) {
      // covered by "first" already
    } else if (cash / Math.max(1, equity) > 0.9 && equity < startingCash * 1.5) {
      out.push({
        id: "cash-heavy",
        tone: "info",
        icon: <Info className="w-4 h-4" />,
        title: "Most of your buying power is idle",
        body: "The point of the sim is to practice. Even a small position teaches more than watching from the sidelines.",
      });
    }

    // Chasing a big single-day move
    if (selectedChangePct != null && Math.abs(selectedChangePct) > 5) {
      out.push({
        id: "momentum",
        tone: "warn",
        icon: <AlertTriangle className="w-4 h-4" />,
        title: `${selected} has moved ${selectedChangePct >= 0 ? "+" : ""}${selectedChangePct.toFixed(1)}% today`,
        body:
          selectedChangePct > 0
            ? "Big one-day pops often fade. Read the news catalyst first and consider whether the story justifies the price before buying."
            : "Sharp drops can be an opportunity or a warning. Check if the story is a one-off event or a real deterioration before averaging down.",
      });
    }

    // Doing well
    const gainPct = startingCash > 0 ? ((equity - startingCash) / startingCash) * 100 : 0;
    if (gainPct >= 10) {
      out.push({
        id: "winning",
        tone: "good",
        icon: <ShieldCheck className="w-4 h-4" />,
        title: `You're up ${gainPct.toFixed(1)}% in the sim`,
        body: "Nice work. Real investors write down what worked (and what didn't) — the pattern is more valuable than the profit itself.",
      });
    }

    // Default coaching tip
    if (!out.length) {
      out.push({
        id: "default",
        tone: "info",
        icon: <Sparkles className="w-4 h-4" />,
        title: "Learn as you trade",
        body: "Every position you open teaches you something. Try a mix of one stock you love and one you don't — comparing them is where the learning happens.",
      });
    }

    return out.slice(0, 3);
  }, [cash, startingCash, equity, holdings, selected, selectedChangePct]);

  return (
    <section aria-label="Educational tips" className="rounded-3xl border-2 bg-card shadow-sm overflow-hidden">
      <header className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        <GraduationCap className="w-4 h-4 text-primary" />
        <h3 className="font-extrabold text-sm">Educational Tips</h3>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-auto">Learn while you play</span>
      </header>
      <ul className="divide-y">
        {tips.map((t) => (
          <li key={t.id} className="p-3.5 flex items-start gap-2.5">
            <span
              className={cn(
                "shrink-0 mt-0.5 rounded-full w-7 h-7 flex items-center justify-center",
                t.tone === "warn" && "bg-down/15 text-down",
                t.tone === "info" && "bg-primary/15 text-primary",
                t.tone === "good" && "bg-up/15 text-up",
              )}
            >
              {t.icon}
            </span>
            <div className="min-w-0">
              <div className="font-bold text-sm leading-snug">{t.title}</div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
