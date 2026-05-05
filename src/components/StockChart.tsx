import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useLiveChart } from "@/hooks/useLiveChart";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { formatNumber, formatLargeNumber } from "@/lib/yahoo";
import { cn } from "@/lib/utils";

const RANGES: { label: string; range: string; interval: string }[] = [
  { label: "1D", range: "1d", interval: "5m" },
  { label: "5D", range: "5d", interval: "15m" },
  { label: "1M", range: "1mo", interval: "1d" },
  { label: "6M", range: "6mo", interval: "1d" },
  { label: "YTD", range: "ytd", interval: "1d" },
  { label: "1Y", range: "1y", interval: "1d" },
  { label: "5Y", range: "5y", interval: "1wk" },
  { label: "Max", range: "max", interval: "1mo" },
];

interface Props {
  symbol: string;
}

export const StockChart = ({ symbol }: Props) => {
  const [rangeIdx, setRangeIdx] = useState(0);
  const r = RANGES[rangeIdx];
  const { data, loading } = useLiveChart(symbol, r.range, r.interval);
  const { quotes } = useLiveQuotes([symbol], 10000);
  const quote = quotes[0];

  const prevClose = data?.previousClose ?? quote?.regularMarketPreviousClose;
  const lastPrice = data?.points.at(-1)?.price ?? quote?.regularMarketPrice;
  const isUp = (lastPrice ?? 0) >= (prevClose ?? 0);

  const chartData = useMemo(() => data?.points ?? [], [data]);

  const formatTime = (t: number) => {
    const d = new Date(t);
    if (r.range === "1d" || r.range === "5d") {
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    if (r.range === "1mo" || r.range === "6mo" || r.range === "ytd") {
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }
    return d.toLocaleDateString([], { month: "short", year: "2-digit" });
  };

  const minMax = useMemo(() => {
    if (!chartData.length) return [0, 0];
    const vals = chartData.map((d) => d.price);
    const min = Math.min(...vals, prevClose ?? Infinity);
    const max = Math.max(...vals, prevClose ?? -Infinity);
    const pad = (max - min) * 0.1 || 1;
    return [min - pad, max + pad];
  }, [chartData, prevClose]);

  return (
    <div className="bg-card border rounded-lg p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold">{quote?.shortName || symbol}</h2>
            <span className="text-sm text-muted-foreground">
              {symbol} · {quote?.exchange}
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold tabular-nums">
              {formatNumber(lastPrice)}
            </span>
            <span
              className={cn(
                "text-lg font-semibold tabular-nums",
                isUp ? "text-up" : "text-down"
              )}
            >
              {isUp ? "+" : ""}
              {formatNumber(quote?.regularMarketChange)} (
              {formatNumber(quote?.regularMarketChangePercent)}%)
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse" />
            Live · auto-updating
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {RANGES.map((rg, i) => (
            <button
              key={rg.label}
              onClick={() => setRangeIdx(i)}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-semibold transition-colors",
                rangeIdx === i
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {rg.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[380px] w-full">
        {loading && !chartData.length ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Loading chart…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradUp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-up))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--chart-up))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradDown" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-down))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--chart-down))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="t"
                tickFormatter={formatTime}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                minTickGap={50}
              />
              <YAxis
                domain={minMax}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                orientation="right"
                width={60}
                tickFormatter={(v) => formatNumber(v)}
              />
              {prevClose && (
                <ReferenceLine
                  y={prevClose}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
              )}
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(v) => new Date(v as number).toLocaleString()}
                formatter={(v: number) => [formatNumber(v), "Price"]}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={isUp ? "hsl(var(--chart-up))" : "hsl(var(--chart-down))"}
                strokeWidth={2}
                fill={isUp ? "url(#gradUp)" : "url(#gradDown)"}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t text-sm">
        <Stat label="Open" value={formatNumber(quote?.regularMarketOpen)} />
        <Stat label="Prev Close" value={formatNumber(quote?.regularMarketPreviousClose)} />
        <Stat label="Day High" value={formatNumber(quote?.regularMarketDayHigh)} />
        <Stat label="Day Low" value={formatNumber(quote?.regularMarketDayLow)} />
        <Stat label="52W High" value={formatNumber(quote?.fiftyTwoWeekHigh)} />
        <Stat label="52W Low" value={formatNumber(quote?.fiftyTwoWeekLow)} />
        <Stat label="Volume" value={formatLargeNumber(quote?.regularMarketVolume)} />
        <Stat label="Mkt Cap" value={formatLargeNumber(quote?.marketCap)} />
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
    <div className="font-semibold tabular-nums">{value}</div>
  </div>
);
