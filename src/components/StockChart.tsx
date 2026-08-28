import { useState, useMemo, useRef, useEffect } from "react";
import {
  ComposedChart,
  Area,
  Line,
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
  { label: "Today", range: "1d", interval: "1m" },
  { label: "5D", range: "5d", interval: "15m" },
  { label: "1M", range: "1mo", interval: "1d" },
  { label: "1Y", range: "1y", interval: "1d" },
  { label: "5Y", range: "5y", interval: "1wk" },
  { label: "All", range: "max", interval: "1mo" },
];


// Intraday interval presets used for candle mode
const INTRADAY: { label: string; range: string; interval: string }[] = [
  { label: "5m", range: "1d", interval: "5m" },
  { label: "15m", range: "1d", interval: "15m" },
  { label: "30m", range: "1d", interval: "30m" },
  { label: "1h", range: "5d", interval: "60m" },
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
  const w = Math.max(2, Math.min(12, bandW * 0.58));
  return (
    <g>
      {data.map((d, i) => {
        if (d.open == null || d.close == null || d.high == null || d.low == null) return null;
        // Ensure high >= low >= 0 and open/close are within [low, high]
        const safeHigh = Math.max(d.high, d.low, d.open, d.close);
        const safeLow = Math.min(d.high, d.low, d.open, d.close);
        if (safeHigh <= 0 || safeLow <= 0) return null;
        const xPos = xScale(d.t as any);
        if (xPos == null || isNaN(xPos)) return null;
        const cx = xPos + bandW / 2;
        const yH = yScale(safeHigh);
        const yL = yScale(safeLow);
        const yO = yScale(d.open);
        const yC = yScale(d.close);
        if ([yH, yL, yO, yC].some((v) => v == null || isNaN(v))) return null;
        const up = d.close >= d.open;
        const color = up ? "hsl(var(--chart-up))" : "hsl(var(--chart-down))";
        const bodyTop = Math.min(yO, yC);
        const bodyH = Math.max(1, Math.abs(yC - yO));
        return (
          <g key={i}>
            <line x1={cx} x2={cx} y1={yH} y2={yL} stroke={color} strokeWidth={1.25} strokeLinecap="round" />
            <rect x={cx - w / 2} y={bodyTop} width={w} height={bodyH} fill={color} stroke={color} strokeWidth={0.5} />
          </g>
        );
      })}
    </g>
  );
};

const usePriceFlash = (value: number | null | undefined) => {
  const prev = useRef<number | null | undefined>(value);
  const [dir, setDir] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    if (value == null) return;
    if (prev.current != null) {
      if (value > prev.current) setDir("up");
      else if (value < prev.current) setDir("down");
      const t = setTimeout(() => setDir(null), 800);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);
  return dir;
};

// Returns market status in US/Eastern. Treats US equities session 9:30-16:00 ET, weekdays.
// Uses Intl.DateTimeFormat (via etParts) rather than `new Date(str.toLocaleString(...))`,
// which is an unreliable round-trip that can misread the ET hour/day depending on the
// runtime's locale parsing and has previously caused this pill to say "closed" during
// the live session. lib/marketHours.ts already solves this correctly — reuse that logic
// here instead of keeping a second, divergent implementation.
const etParts = (d = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = get("weekday");
  const hour = Number(get("hour") === "24" ? "0" : get("hour"));
  const minute = Number(get("minute"));
  return { weekday, minutes: hour * 60 + minute };
};

const useMarketStatus = () => {
  const [status, setStatus] = useState<"open" | "pre" | "post" | "closed">("closed");
  useEffect(() => {
    const compute = () => {
      const { weekday, minutes } = etParts();
      if (weekday === "Sat" || weekday === "Sun") return setStatus("closed");
      if (minutes < 4 * 60) return setStatus("closed");
      if (minutes < 9 * 60 + 30) return setStatus("pre");
      if (minutes < 16 * 60) return setStatus("open");
      if (minutes < 20 * 60) return setStatus("post");
      return setStatus("closed");
    };
    compute();
    const t = setInterval(compute, 30000);
    return () => clearInterval(t);
  }, []);
  return status;
};

export const StockChart = ({ symbol }: Props) => {
  const [rangeIdx, setRangeIdx] = useState(0);
  const [chartType, setChartType] = useState<ChartType>("mountain");
  const [intradayIdx, setIntradayIdx] = useState(0);
  const marketStatus = useMarketStatus();
  const r = chartType === "candle" ? INTRADAY[intradayIdx] : RANGES[rangeIdx];
  const is1D = chartType === "mountain" && rangeIdx === 0;
  // Before regular session (pre-open / weekend), fetch 5d and slice to last session.
  const showPrevSession = is1D && (marketStatus === "pre" || marketStatus === "closed");
  const fetchRange = showPrevSession ? "5d" : r.range;
  const fetchInterval = showPrevSession ? "5m" : r.interval;
  const { data, loading, error, refetch } = useLiveChart(symbol, fetchRange, fetchInterval, 3000, is1D && !showPrevSession);
  const { quotes } = useLiveQuotes([symbol], 2000);
  const quote = quotes[0];

  // For non-1D ranges, derive change from the chart's first vs last point
  const firstPrice = data?.points[0]?.price;
  const rawLast = data?.points.at(-1)?.price;
  // In prev-session mode, only the sliced day counts.
  const sessionPts = showPrevSession && data?.points.length
    ? (() => {
        const lastDay = new Date(data.points.at(-1)!.t).toDateString();
        return data.points.filter((p) => new Date(p.t).toDateString() === lastDay);
      })()
    : null;
  const lastPrice = showPrevSession
    ? (sessionPts?.at(-1)?.price ?? rawLast)
    : (rawLast ?? quote?.regularMarketPrice);

  const prevClose = showPrevSession
    ? (quote?.regularMarketPreviousClose ?? data?.previousClose ?? sessionPts?.[0]?.price)
    : is1D
      ? (data?.previousClose ?? quote?.regularMarketPreviousClose)
      : firstPrice;

  const displayChange = lastPrice != null && prevClose != null ? lastPrice - prevClose : null;
  const displayChangePct = displayChange != null && prevClose != null && prevClose !== 0
    ? (displayChange / prevClose) * 100
    : null;
  const isUp = (displayChange ?? 0) >= 0;
  const priceFlash = usePriceFlash(typeof lastPrice === "number" ? lastPrice : null);

  const chartData = useMemo(() => {
    const pts = data?.points ?? [];
    if (chartType === "candle") {
      return pts.filter(
        (p) =>
          [p.open, p.close, p.high, p.low].every(
            (v) => typeof v === "number" && Number.isFinite(v)
          ) &&
          p.high! >= Math.max(p.open!, p.close!, p.low!) &&
          p.low! <= Math.min(p.open!, p.close!, p.high!)
      );
    }
    // Prev-session mode: slice the 5d feed to the most recent calendar day.
    if (showPrevSession && pts.length) {
      const lastDay = new Date(pts.at(-1)!.t).toDateString();
      return pts.filter((p) => new Date(p.t).toDateString() === lastDay);
    }
    // For 1D mountain (live): pad with empty future slots from now → market close
    // so the chart starts mostly empty and slowly fills up over the day.
    if (is1D) {
      const sessionEnd = (data?.meta?.currentTradingPeriod?.regular?.end as number | undefined);
      const sessionStart = (data?.meta?.currentTradingPeriod?.regular?.start as number | undefined);
      const stepMs = 5 * 60 * 1000;
      const lastT = pts.at(-1)?.t;
      const startMs = sessionStart ? sessionStart * 1000 : (pts[0]?.t ?? Date.now());
      const endMs = sessionEnd ? sessionEnd * 1000 : (lastT ?? Date.now()) + 6.5 * 60 * 60 * 1000;
      const head: ChartPoint[] = [];
      if (pts.length === 0 || (pts[0]?.t ?? endMs) > startMs) {
        const firstReal = pts[0]?.t ?? endMs;
        for (let t = startMs; t < firstReal; t += stepMs) {
          head.push({ t, price: null as any, regularPrice: null as any, afterHoursPrice: null as any });
        }
      }
      const tail: ChartPoint[] = [];
      const tailStart = (lastT ?? startMs) + stepMs;
      for (let t = tailStart; t <= endMs; t += stepMs) {
        tail.push({ t, price: null as any, regularPrice: null as any, afterHoursPrice: null as any });
      }
      return [...head, ...pts, ...tail];
    }
    return pts;
  }, [data, chartType, is1D, showPrevSession]);

  const withSMA = chartData;

  const formatTime = (t: number) => {
    const d = new Date(t);
    if (r.range === "1d") {
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    if (r.range === "5d") {
      return d.toLocaleDateString([], { weekday: "short", hour: "numeric" });
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
      if (chartType === "mountain") {
        if (typeof d.price === "number" && Number.isFinite(d.price)) vals.push(d.price);
      } else {
        if (typeof d.high === "number" && Number.isFinite(d.high)) vals.push(d.high);
        if (typeof d.low === "number" && Number.isFinite(d.low)) vals.push(d.low);
      }
    });
    if (is1D && typeof prevClose === "number") vals.push(prevClose);
    if (!vals.length) return [0, 1];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min;
    // Tight padding so intraday wiggles look spiky and accurate, not flat.
    const pad = range > 0 ? range * 0.08 : Math.max(1, max * 0.005);
    return [min - pad, max + pad];
  }, [chartData, prevClose, chartType, is1D]);

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
            <span
              className={cn(
                "text-4xl font-bold tabular-nums rounded px-1 -mx-1 transition-colors",
                priceFlash === "up" && "bg-up/25 text-up",
                priceFlash === "down" && "bg-down/25 text-down",
              )}
            >
              {formatNumber(lastPrice)}
            </span>
            {displayChange != null && (
              <span
                className={cn(
                  "text-lg font-semibold tabular-nums",
                  isUp ? "text-up" : "text-down"
                )}
              >
                {isUp ? "+" : ""}
                {formatNumber(displayChange)}
                {displayChangePct != null && (
                  <> ({isUp ? "+" : ""}{formatNumber(displayChangePct)}%)</>
                )}
                <span className="ml-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  over {r.label.toLowerCase()}
                </span>
              </span>
            )}
            {(() => {
              const pillMap = {
                open: { dot: "bg-success animate-pulse", text: "Live · market open" },
                pre: { dot: "bg-primary", text: "Pre-market · showing previous session" },
                post: { dot: "bg-primary animate-pulse", text: "After-hours" },
                closed: { dot: "bg-muted-foreground", text: "Market closed
