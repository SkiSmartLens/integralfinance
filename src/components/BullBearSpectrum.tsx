import { cn } from "@/lib/utils";
import { stanceLabel, stanceTone } from "@/lib/stockSummary";

const TONE_TEXT = { up: "text-up", down: "text-down", neutral: "text-muted-foreground" } as const;

/**
 * Where the AI's read of a stock sits between its bear case (-100, left) and
 * its bull case (100, right), as a marker on a red-to-green bar. `compact`
 * draws just the bar, for a card header.
 */
export const BullBearSpectrum = ({
  score,
  reason,
  compact = false,
  className,
}: {
  score: number;
  reason?: string;
  compact?: boolean;
  className?: string;
}) => {
  const clamped = Math.max(-100, Math.min(100, score));
  const label = stanceLabel(clamped);
  // Spans, so the compact bar is valid inside a button.
  const bar = (
    <span
      role="meter"
      aria-label="AI's bull vs. bear read"
      aria-valuemin={-100}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-valuetext={label}
      className={cn("relative block rounded-full", compact ? "h-1.5" : "h-2.5")}
      style={{
        background: "linear-gradient(to right, hsl(var(--chart-down)), hsl(var(--muted-foreground) / 0.3), hsl(var(--chart-up)))",
      }}
    >
      <span className="absolute left-1/2 inset-y-0 w-0.5 -translate-x-1/2 bg-background/80" />
      <span
        className={cn(
          "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow transition-[left] duration-500",
          compact ? "w-3 h-3" : "w-4 h-4",
        )}
        style={{ left: `${(clamped + 100) / 2}%` }}
      />
    </span>
  );
  if (compact) return <span className={cn("block", className)}>{bar}</span>;

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Bull vs. bear</span>
        <span className={cn("text-sm font-extrabold", TONE_TEXT[stanceTone(clamped)])}>{label}</span>
      </div>
      {bar}
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1.5">
        <span>Bearish</span>
        <span>Balanced</span>
        <span>Bullish</span>
      </div>
      {reason && <p className="text-sm leading-relaxed mt-3">{reason}</p>}
      <p className="text-[11px] text-muted-foreground mt-2">The AI's read of the bull and bear case, not financial advice.</p>
    </div>
  );
};
