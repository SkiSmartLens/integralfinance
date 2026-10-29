import { formatNumber } from "@/lib/yahoo";
import { cn } from "@/lib/utils";

/** How much a price moved over a time span, in dollars and percent. */
export interface PriceMove {
  change: number | null;
  pct: number | null;
  /** "today", "past month", "all time", ... */
  span: string;
  /** True for the one-day view, where a stock quote's own day change is a fine stand-in. */
  isDay: boolean;
}

/**
 * The span a quote's day change covers: today's session while it's running or
 * just ended, otherwise (before the open, overnight, weekends) the last one.
 */
export const daySpan = (marketState?: string) =>
  !marketState || marketState === "REGULAR" || marketState === "POST" ? "today" : "last session";

const two = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

/** "+$12.40 (+6.80%) past month", green when up and red when down. Nothing when the move isn't known. */
export const PriceChange = ({
  change,
  pct,
  span,
  className,
}: { change: number | null | undefined; pct: number | null | undefined; span?: string; className?: string }) => {
  const known = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n);
  if (!known(change) && !known(pct)) return null;
  const up = (known(change) ? change : pct!) >= 0;
  const sign = up ? "+" : "-";
  return (
    <span className={cn("font-semibold tabular-nums", up ? "text-up" : "text-down", className)}>
      {known(change) && `${sign}$${formatNumber(Math.abs(change), two)}`}
      {known(change) && known(pct) && " "}
      {known(pct) && (known(change) ? `(${sign}${formatNumber(Math.abs(pct), two)}%)` : `${sign}${formatNumber(Math.abs(pct), two)}%`)}
      {span && <span className="ml-1 text-xs font-medium text-muted-foreground">{span}</span>}
    </span>
  );
};
