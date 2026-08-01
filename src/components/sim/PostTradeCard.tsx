import { useEffect, useState } from "react";
import { CheckCircle2, X, AlertTriangle, ShieldCheck, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Holding } from "./HoldingsPanel";

interface Props {
  symbol: string;
  side: "buy" | "sell" | "short" | "cover";
  shares: number;
  price?: number;
  holdings: Holding[];
  equity: number;
  changePct?: number;
  onDismiss: () => void;
}

/**
 * Contextual, dismissible note shown right after a trade fills.
 * Reuses SafetyMeter logic (portfolio concentration) + WhyItMoved framing
 * (bullish/bearish sentiment) to give beginners a one-line takeaway.
 */
export const PostTradeCard = ({
  symbol,
  side,
  shares,
  price,
  holdings,
  equity,
  changePct,
  onDismiss,
}: Props) => {
  const [visible, setVisible] = useState(true);

  // Auto-dismiss after 20s so it doesn't linger.
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 20000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!visible) onDismiss();
  }, [visible, onDismiss]);

  if (!visible) return null;

  const position = holdings.find((h) => h.symbol === symbol);
  const positionValue = position ? Math.abs(position.last * position.shares) : 0;
  const concentration = equity > 0 ? positionValue / equity : 0;
  const concentrationPct = Math.round(concentration * 100);

  const bullishMove = (changePct ?? 0) >= 0;

  let note = "";
  let tone: "good" | "warn" | "info" = "info";
  let Icon = CheckCircle2;

  if (concentration >= 0.4 && (side === "buy" || side === "short")) {
    note = `Heads up — ${symbol} now makes up about ${concentrationPct}% of your portfolio. Consider spreading risk across a few different companies.`;
    tone = "warn";
    Icon = AlertTriangle;
  } else if (holdings.filter((h) => h.shares !== 0).length >= 3) {
    note = `Nice — you're diversified across ${holdings.filter((h) => h.shares !== 0).length} positions. Keep watching how each one reacts to news.`;
    tone = "good";
    Icon = ShieldCheck;
  } else if (side === "buy") {
    note = `${symbol} is ${bullishMove ? "up" : "down"} today. Tap "Bullish/Bearish take" below for the AI explanation of why.`;
    Icon = TrendingUp;
  } else if (side === "sell") {
    note = `Sold ${shares} share${shares === 1 ? "" : "s"} of ${symbol}. Your cash balance updated — you can redeploy it into other stocks.`;
  } else if (side === "short") {
    note = `You're short ${symbol}. You profit if the price falls, but losses are unlimited if it keeps rising. Watch it closely.`;
    tone = "warn";
    Icon = AlertTriangle;
  } else if (side === "cover") {
    note = `Covered your short. Your position in ${symbol} is closed.`;
  }

  const toneCls =
    tone === "warn"
      ? "border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900/60"
      : tone === "good"
      ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900/60"
      : "border-primary/30 bg-primary/5";

  const iconCls =
    tone === "warn"
      ? "text-amber-600"
      : tone === "good"
      ? "text-emerald-600"
      : "text-primary";

  return (
    <div
      role="status"
      className={cn(
        "rounded-2xl border-2 p-3.5 flex items-start gap-3 animate-fade-in",
        toneCls,
      )}
    >
      <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", iconCls)} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1">
          Trade filled{price ? ` · $${price.toFixed(2)}` : ""}
        </div>
        <p className="text-sm leading-relaxed">{note}</p>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="shrink-0 p-1 -m-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
};
