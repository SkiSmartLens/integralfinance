import { AlertTriangle, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Holding } from "./HoldingsPanel";

interface Props {
  holdings: Holding[];
  cash: number;
  equity: number;
}

/**
 * Portfolio Safety Meter — visualizes diversification for beginners.
 * Red = concentrated in 1 stock, Amber = 2 stocks, Green = 3+ stocks spread out.
 */
export const SafetyMeter = ({ holdings, cash, equity }: Props) => {
  const positions = holdings.filter((h) => h.shares !== 0);
  const n = positions.length;
  const invested = Math.max(0, equity - cash);
  const biggest = positions
    .map((h) => Math.abs(h.last * h.shares))
    .sort((a, b) => b - a)[0] ?? 0;
  const concentration = invested > 0 ? biggest / invested : 0;

  // Score 0..100
  let score = 10;
  if (n === 0) score = 20;
  else if (n === 1) score = 15;
  else if (n === 2) score = 50;
  else if (n >= 3 && concentration < 0.6) score = 90;
  else if (n >= 3) score = 70;

  const level: "danger" | "ok" | "good" =
    score >= 75 ? "good" : score >= 45 ? "ok" : "danger";

  const color =
    level === "good"
      ? "bg-emerald-500"
      : level === "ok"
      ? "bg-amber-500"
      : "bg-rose-500";

  const label =
    n === 0
      ? "Start with a small position"
      : level === "good"
      ? "Nicely diversified"
      : level === "ok"
      ? "Getting there — add one more stock"
      : "All eggs in one basket";

  const Icon =
    level === "good" ? ShieldCheck : level === "ok" ? Sparkles : AlertTriangle;

  return (
    <div className="rounded-3xl border-2 bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={cn(
            "shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
            level === "good" && "bg-emerald-100 text-emerald-700",
            level === "ok" && "bg-amber-100 text-amber-700",
            level === "danger" && "bg-rose-100 text-rose-700",
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground">
            Portfolio Safety Meter
          </div>
          <div className="font-extrabold text-sm sm:text-base leading-tight">{label}</div>
        </div>
        <div className="text-xs font-bold text-muted-foreground tabular-nums">
          {n} stock{n === 1 ? "" : "s"}
        </div>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full transition-all duration-500", color)}
          style={{ width: `${Math.max(6, score)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
        Spread across <span className="font-bold text-foreground">3 or more stocks</span> in different
        industries to keep this meter green.
      </p>
    </div>
  );
};
