import { useState, useMemo, useRef, useEffect } from "react";
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Customized,
} from "recharts";
import { useLiveChart } from "@/hooks/useLiveChart";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { formatNumber, formatLargeNumber, ChartPoint } from "@/lib/yahoo";
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

// Intraday interval presets used for candle mode
const INTRADAY: { label: string; range: string; interval: string }[] = [
  { label: "5m", range: "5d", interval: "5m" },
  { label: "15m", range: "1mo", interval: "15m" },
  { label: "30m", range: "1mo", interval: "30m" },
  { label: "1h", range: "3mo", interval: "60m" },
  { label: "3h", range: "6mo", interval: "90m" },
];

type ChartType = "mountain" | "candle";

interface Props {
  symbol: string;
}

// Custom candle renderer using Customized — has access to xAxisMap & yAxisMap
const makeCandleLayer = (data: ChartPoint[]) => (props: any) => {
  const { xAxisMap, yAxisMap } = props;
  if (!xAxisMap || !yAxisMap) return null;
  const xAxis: any = xAxisMap[Object.keys(xAxisMap)[0]];
  const yAxis: any = yAxisMap[Object.keys(yAxisMap)[0]];
  if (!xAxis || !yAxis || !data.length) return null;
  const xScale = xAxis.scale;
  const yScale = yAxis.scale;
  const bandW = typeof xScale.bandwidth === "function" ? xScale.bandwidth() : (xAxis.width || 0) / Math.max(1, data.length);
  const w = Math.max(2, Math.min(14, bandW * 0.75));
  return (
    <g>
      {data.map((d, i) => {
        if (d.open == null || d.close == null || d.high == null || d.low == null) return null;
        const xPos = xScale(d.t as any);
        if (xPos == null || isNaN(xPos)) return null;
        const cx = xPos + bandW / 2;
        const yH = yScale(d.high);
        const yL = yScale(d.low);
        const yO = yScale(d.open);
        const yC = yScale(d.close);
        const up = d.close >= d.open;
        const color = up ? "hsl(var(--chart-up))" : "hsl(var(--chart-down))";
        const top = Math.min(yO, yC);
        const h = Math.max(1, Math.abs(yC - yO));
        return (
          <g key={i}>
            <line x1={cx} x2={cx} y1={yH} y2={yL} stroke={color} strokeWidth={1} />
            <rect x={cx - w / 2} y={top} width={w} height={h} fill={color} stroke={color} strokeWidth={0.5} />
          </g>
        );
      })}
    </g>
  );
};

export const StockChart = ({ symbol }: Props) => {
  const [rangeIdx, setRangeIdx] = useState(0);
  const [chartType, setChartType] = useState<ChartType>("mountain");
  const [intradayIdx, setIntradayIdx] = useState(0);
  const r = chartType === "candle" ? INTRADAY[intradayIdx] : RANGES[rangeIdx];
  const { data, loading } = useLiveChart(symbol, r.range, r.interval);
  const { quotes } = useLiveQuotes([symbol], 10000);
  const quote = quotes[0];

  const prevClose = data?.previousClose ?? quote?.regularMarketPreviousClose;
  const lastPrice = data?.points.at(-1)?.price ?? quote?.regularMarketPrice;
  const isUp = (lastPrice ?? 0) >= (prevClose ?? 0);
  const change = lastPrice != null && prevClose != null ? lastPrice - prevClose : null;

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
    const vals: number[] = [];
    chartData.forEach((d) => {
      if (chartType === "mountain") vals.push(d.price);
      else {
        if (d.high != null) vals.push(d.high);
        if (d.low != null) vals.push(d.low);
      }
    });
    if (prevClose != null) vals.push(prevClose);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.1 || 1;
    return [min - pad, max + pad];
  }, [chartData, prevClose, chartType]);

  // ===== Pinch-to-compare (two-finger) =====
  const wrapRef = useRef<HTMLDivElement>(null);
  const pointers = useRef<Map<number, { x: number }>>(new Map());
  const [compare, setCompare] = useState<{ a: ChartPoint; b: ChartPoint } | null>(
    null
  );

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || chartData.length < 2) return;

    const rectInfo = () => el.getBoundingClientRect();

    const pickPoint = (clientX: number): ChartPoint | null => {
      const rect = rectInfo();
      const ratio = (clientX - rect.left) / rect.width;
      const idx = Math.max(
        0,
        Math.min(chartData.length - 1, Math.round(ratio * (chartData.length - 1)))
      );
      return chartData[idx];
    };

    const update = () => {
      if (pointers.current.size >= 2) {
        const xs = [...pointers.current.values()].map((p) => p.x);
        const a = pickPoint(Math.min(...xs));
        const b = pickPoint(Math.max(...xs));
        if (a && b) setCompare({ a, b });
      } else {
        setCompare(null);
      }
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      pointers.current.set(e.pointerId, { x: e.clientX });
      update();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX });
      if (pointers.current.size >= 2) e.preventDefault();
      update();
    };
    const onUp = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId);
      update();
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove, { passive: false });
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("pointerleave", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("pointerleave", onUp);
    };
  }, [chartData]);

  const compareDelta = compare
    ? {
        d: compare.b.price - compare.a.price,
        pct: ((compare.b.price - compare.a.price) / compare.a.price) * 100,
      }
    : null;

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
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-4xl font-bold tabular-nums">
              {formatNumber(lastPrice)}
            </span>
            {change != null && (
              <span
                className={cn(
                  "text-lg font-semibold tabular-nums",
                  isUp ? "text-up" : "text-down"
                )}
              >
                {isUp ? "+" : ""}
                {formatNumber(change)}
                {quote?.regularMarketChangePercent != null && (
                  <> ({isUp ? "+" : ""}{formatNumber(quote.regularMarketChangePercent)}%)</>
                )}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse" />
            Live · auto-updating
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-1">
            {(["mountain", "candle"] as ChartType[]).map((t) => (
              <button
                key={t}
                onClick={() => setChartType(t)}
                className={cn(
                  "px-3 py-1.5 rounded text-xs font-semibold capitalize transition-colors",
                  chartType === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          {chartType === "candle" ? (
            <div className="flex flex-wrap gap-1 justify-end">
              {INTRADAY.map((rg, i) => (
                <button
                  key={rg.label}
                  onClick={() => setIntradayIdx(i)}
                  className={cn(
                    "px-3 py-1.5 rounded text-xs font-semibold transition-colors",
                    intradayIdx === i
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {rg.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1 justify-end">
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
          )}
        </div>
      </div>

      <div
        ref={wrapRef}
        className="h-[380px] w-full relative touch-none select-none"
      >
        {loading && !chartData.length ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Loading chart…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
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
                type="category"
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
                formatter={(v: number, name: string) => [formatNumber(v), name]}
              />
              {chartType === "mountain" && (
                <Area
                  type="linear"
                  dataKey="price"
                  stroke={isUp ? "hsl(var(--chart-up))" : "hsl(var(--chart-down))"}
                  strokeWidth={1.75}
                  fill={isUp ? "url(#gradUp)" : "url(#gradDown)"}
                  isAnimationActive={false}
                  dot={false}
                />
              )}
              {chartType === "candle" && (
                <Customized component={makeCandleLayer(chartData)} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {compare && compareDelta && (
          <div className="absolute top-2 left-2 bg-background/95 border rounded-md px-3 py-2 shadow-lg text-xs">
            <div className="font-semibold mb-1">Compare</div>
            <div className="tabular-nums">
              {formatNumber(compare.a.price)} → {formatNumber(compare.b.price)}
            </div>
            <div
              className={cn(
                "tabular-nums font-semibold",
                compareDelta.d >= 0 ? "text-up" : "text-down"
              )}
            >
              {compareDelta.d >= 0 ? "+" : ""}
              {formatNumber(compareDelta.d)} ({compareDelta.pct >= 0 ? "+" : ""}
              {formatNumber(compareDelta.pct)}%)
            </div>
          </div>
        )}
      </div>
      <div className="text-[10px] text-muted-foreground mt-2 md:hidden">
        Tip: touch with two fingers to compare two points.
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
