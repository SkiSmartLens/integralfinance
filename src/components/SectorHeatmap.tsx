import { SECTORS } from "@/lib/categories";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { formatNumber } from "@/lib/yahoo";
import { cn } from "@/lib/utils";

interface Props {
  onSelect?: (symbol: string) => void;
}

// Maps a percentage change to a tailwind background-color intensity.
function pctToBg(pct: number | undefined): string {
  if (pct == null || isNaN(pct)) return "bg-muted";
  const a = Math.min(1, Math.abs(pct) / 3); // saturate at +/- 3%
  if (pct >= 0) return "";
  return "";
  // see inline style for actual color
}

function pctStyle(pct: number | undefined): React.CSSProperties {
  if (pct == null || isNaN(pct)) return { background: "hsl(var(--muted))" };
  const a = Math.max(0.18, Math.min(0.95, Math.abs(pct) / 3));
  const hue = pct >= 0 ? "var(--chart-up)" : "var(--chart-down)";
  return { background: `hsl(${hue} / ${a})` };
}

export const SectorHeatmap = ({ onSelect }: Props) => {
  const symbols = SECTORS.map((s) => s.symbol);
  const { quotes, loading } = useLiveQuotes(symbols, 30000);

  return (
    <section className="bg-card border rounded-lg p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-bold">Sector Performance</h3>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
          Today · SPDR ETFs
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {SECTORS.map((s) => {
          const q = quotes.find((x) => x.symbol === s.symbol);
          const pct = q?.regularMarketChangePercent;
          return (
            <button
              key={s.symbol}
              onClick={() => onSelect?.(s.symbol)}
              style={pctStyle(pct)}
              className={cn(
                "rounded-md p-3 text-left transition-transform hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-primary",
                pctToBg(pct),
              )}
            >
              <div className="text-[10px] uppercase tracking-wider text-foreground/80 font-semibold">
                {s.symbol}
              </div>
              <div className="text-sm font-bold leading-tight truncate text-foreground">
                {s.name}
              </div>
              <div className="text-base font-bold tabular-nums mt-1 text-foreground">
                {pct == null ? (loading ? "…" : "—") : `${pct >= 0 ? "+" : ""}${formatNumber(pct)}%`}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
