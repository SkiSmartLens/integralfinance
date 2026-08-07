import { useState } from "react";
import { formatNumber } from "@/lib/yahoo";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./AnimatedNumber";
import type { Holding } from "./HoldingsPanel";

interface Props {
  equity: number;
  /** Total deployable capital for this account (e.g. starting cash × leverage). */
  buyingPower: number;
  dayPL: number;
  totalReturnPct: number;
  holdings: Holding[];
  /** True while the US market is in its regular session. */
  marketOpen?: boolean;
  onSelect?: (symbol: string) => void;
}

const money = (n: number) => `$${formatNumber(Math.abs(n))}`;
const signedMoney = (n: number) => `${n >= 0 ? "+" : "−"}${money(n)}`;

/**
 * Top-of-page portfolio header: net worth, today's gains, total return and
 * buying power, plus a single allocation bar. Each slice is one position,
 * tinted green/red by its unrealized gain; cash is a neutral grey slice.
 * Hovering a slice reveals its value and gain.
 */
export const PortfolioBar = ({ equity, buyingPower, dayPL, totalReturnPct, holdings, marketOpen = false, onSelect }: Props) => {
  const [hover, setHover] = useState<string | null>(null);

  const slices = holdings
    .map((h) => {
      const value = Math.abs(h.last * h.shares);
      const cost = Math.abs(h.avgCost * h.shares);
      const pl = h.last * h.shares - h.avgCost * h.shares;
      return { key: h.symbol, label: h.symbol, value, pl, plPct: cost > 0 ? (pl / cost) * 100 : 0, kind: "position" as const };
    })
    .sort((a, b) => b.value - a.value);

  const invested = slices.reduce((s, x) => s + x.value, 0);
  const available = Math.max(0, buyingPower - invested);
  const total = Math.max(buyingPower, invested);
  const all = [
    ...slices,
    { key: "__cash", label: "Buying power", value: available, pl: 0, plPct: 0, kind: "cash" as const },
  ].filter((s) => s.value > 0);

  const active = all.find((s) => s.key === hover);

  return (
    <section className="rounded-3xl border bg-card px-6 py-7 sm:px-8 sm:py-8 shadow-sm">
      <div className="flex flex-wrap items-end gap-x-12 gap-y-6">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">Net worth</div>
          <div className="text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight mt-1">
            <AnimatedNumber value={equity} format={money} />
          </div>
        </div>
        {marketOpen ? (
          <Metric label="Live session" value={signedMoney(dayPL)} tone={dayPL >= 0 ? "up" : "down"} />
        ) : (
          <Metric label="Market closed" value="—" />
        )}
        <Metric
          label="Total return"
          value={`${totalReturnPct >= 0 ? "+" : "−"}${formatNumber(Math.abs(totalReturnPct))}%`}
          tone={totalReturnPct >= 0 ? "up" : "down"}
        />
        <Metric label="Buying power" value={money(available)} />
      </div>

      {/* Allocation bar */}
      <div className="mt-8">
        <div
          className="flex h-3 w-full gap-1 overflow-hidden rounded-full bg-muted"
          onMouseLeave={() => setHover(null)}
        >
          {all.length === 0 ? (
            <div className="w-full" />
          ) : (
            all.map((s) => (
              <button
                key={s.key}
                type="button"
                aria-label={`${s.label} ${money(s.value)}`}
                onMouseEnter={() => setHover(s.key)}
                onFocus={() => setHover(s.key)}
                onClick={() => s.kind === "position" && onSelect?.(s.key)}
                style={{ width: `${total > 0 ? (s.value / total) * 100 : 0}%` }}
                className={cn(
                  "h-full rounded-full transition-all duration-200 first:rounded-l-full last:rounded-r-full",
                  s.kind === "cash"
                    ? "bg-muted-foreground/25"
                    : s.pl >= 0
                    ? "bg-up"
                    : "bg-down",
                  hover && hover !== s.key && "opacity-40",
                )}
              />
            ))
          )}
        </div>

        <div className="mt-3 h-5 text-xs">
          {active ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 animate-fade-in">
              <span className="font-extrabold">{active.label}</span>
              <span className="text-muted-foreground tabular-nums">{money(active.value)}</span>
              <span className="text-muted-foreground">
                {total > 0 ? `${formatNumber((active.value / total) * 100)}% of buying power` : ""}
              </span>
              {active.kind === "position" && (
                <span className={cn("font-bold tabular-nums", active.pl >= 0 ? "text-up" : "text-down")}>
                  {signedMoney(active.pl)} ({active.plPct >= 0 ? "+" : "−"}
                  {formatNumber(Math.abs(active.plPct))}%)
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">
              Hover the bar to see each position and your available buying power.
            </span>
          )}
        </div>
      </div>
    </section>
  );
};

const Metric = ({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) => (
  <div>
    <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">{label}</div>
    <div
      className={cn(
        "text-lg sm:text-xl font-bold tabular-nums mt-1",
        tone === "up" && "text-up",
        tone === "down" && "text-down",
      )}
    >
      {value}
    </div>
  </div>
);
