import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { supabase } from "@/lib/backend";
import { formatNumber } from "@/lib/yahoo";
import { Clock, LineChart } from "lucide-react";

interface Point {
  t: number;
  equity: number;
  /** The seeded game-start point and the live trailing point aren't real snapshot rows. */
  live?: boolean;
}

/**
 * Net worth over time. Real history comes from `portfolio_snapshots`, which a
 * new row is added to at most once every 12 hours (see Sim.tsx) — there's no
 * backend cron here, so the cadence is enforced at write time instead. The
 * line always ends on the current live equity so it never looks stale between
 * snapshots.
 */
export const NetWorthChart = ({
  memberId,
  equity,
  startingCash,
}: {
  memberId: string;
  equity: number;
  startingCash: number;
}) => {
  const [history, setHistory] = useState<Point[] | null>(null);

  useEffect(() => {
    let alive = true;
    supabase
      .from("portfolio_snapshots")
      .select("equity, recorded_at")
      .eq("member_id", memberId)
      .order("recorded_at", { ascending: true })
      .then(({ data }) => {
        if (!alive) return;
        setHistory(
          (data ?? []).map((r) => ({ t: new Date(r.recorded_at).getTime(), equity: Number(r.equity) })),
        );
      });
    return () => {
      alive = false;
    };
  }, [memberId]);

  const points = useMemo(() => {
    if (history === null) return [];
    const base =
      history.length === 0 && startingCash > 0
        ? [{ t: Date.now() - 60_000, equity: startingCash, live: true }]
        : history;
    return [...base, { t: Date.now(), equity, live: true }];
  }, [history, equity, startingCash]);

  const first = points[0]?.equity;
  const last = points.at(-1)?.equity;
  const up = first != null && last != null ? last >= first : true;
  const color = up ? "hsl(var(--chart-up))" : "hsl(var(--chart-down))";

  const domain = useMemo(() => {
    if (!points.length) return [0, 1] as [number, number];
    const vals = points.map((p) => p.equity);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.15 || max * 0.02 || 1;
    return [min - pad, max + pad] as [number, number];
  }, [points]);

  return (
    <section className="rounded-3xl border bg-card px-5 py-5 sm:px-6 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="font-extrabold text-sm inline-flex items-center gap-1.5">
          <LineChart className="w-4 h-4 text-primary" /> Your net worth
        </h3>
        <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
          <Clock className="w-3 h-3" /> Updates every 12 hours
        </span>
      </div>
      <div className="h-32 w-full">
        {history === null ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : points.length < 2 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Check back in a bit — your history will start filling in.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="networth-grad" x1="0" y1="0" x2="0" y2="1">
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
                labelFormatter={(t) =>
                  new Date(t as number).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                }
                formatter={(v: number) => [`$${formatNumber(v)}`, "Net worth"]}
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke={color}
                strokeWidth={2}
                fill="url(#networth-grad)"
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
};
