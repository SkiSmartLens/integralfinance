import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { useLiveChart } from "@/hooks/useLiveChart";
import { formatNumber } from "@/lib/yahoo";
import { cn } from "@/lib/utils";

const RANGES = [
  { label: "1D", range: "1d", interval: "5m" },
  { label: "1W", range: "5d", interval: "15m" },
  { label: "1M", range: "1mo", interval: "1d" },
] as const;

export const MiniChart = ({ symbol }: { symbol: string }) => {
  const [idx, setIdx] = useState(0);
  const r = RANGES[idx];
  const { data, loading } = useLiveChart(symbol, r.range, r.interval, 5000);

  const points = useMemo(
    () => (data?.points ?? []).filter((p) => typeof p.price === "number" && Number.isFinite(p.price)),
    [data]
  );

  const first = points[0]?.price;
  const last = points.at(-1)?.price;
  const up = first != null && last != null ? last >= first : true;
  const color = up ? "hsl(var(--chart-up))" : "hsl(var(--chart-down))";
  const gradId = `mini-${up ? "up" : "down"}`;

  const domain = useMemo(() => {
    if (!points.length) return [0, 1] as [number, number];
    const vals = points.map((p) => p.price as number);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.12 || max * 0.01 || 1;
    return [min - pad, max + pad] as [number, number];
  }, [points]);

  return (
    <div className="animate-fade-in">
      <div className="flex justify-end gap-1 mb-2">
        {RANGES.map((rg, i) => (
          <button
            key={rg.label}
            onClick={() => setIdx(i)}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-semibold transition-colors",
              idx === i ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {rg.label}
          </button>
        ))}
      </div>
      <div className="h-44 w-full">
        {loading && !points.length ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : !points.length ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={domain} />
              <Tooltip
                cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "3 3" }}
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                  fontSize: 12,
                }}
                labelFormatter={(t) => new Date(t as number).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                formatter={(v: number) => [`$${formatNumber(v)}`, "Price"]}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gradId})`}
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
