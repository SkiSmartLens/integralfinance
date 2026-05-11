import { Header } from "@/components/Header";
import { Ticker } from "@/components/Ticker";
import { Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

type Impact = "high" | "medium" | "low";

interface Event {
  date: string; // ISO date YYYY-MM-DD
  time?: string; // 24h HH:MM ET
  country: "US" | "EU" | "UK" | "JP" | "CN";
  title: string;
  category: "Fed" | "CPI" | "Jobs" | "GDP" | "Earnings" | "PMI" | "Retail" | "Housing" | "Other";
  impact: Impact;
}

// Curated upcoming US-centric calendar. Refreshed quarterly — a real implementation
// would pull from a paid feed. Dates are typical release windows.
const EVENTS: Event[] = [
  { date: "2026-05-13", time: "08:30", country: "US", title: "CPI (April)", category: "CPI", impact: "high" },
  { date: "2026-05-15", time: "08:30", country: "US", title: "Retail Sales (April)", category: "Retail", impact: "high" },
  { date: "2026-05-15", time: "08:30", country: "US", title: "PPI (April)", category: "CPI", impact: "medium" },
  { date: "2026-05-21", time: "10:00", country: "US", title: "Existing Home Sales", category: "Housing", impact: "medium" },
  { date: "2026-05-22", time: "14:00", country: "US", title: "FOMC Minutes", category: "Fed", impact: "high" },
  { date: "2026-05-29", time: "08:30", country: "US", title: "GDP (Q1, 2nd estimate)", category: "GDP", impact: "high" },
  { date: "2026-05-30", time: "08:30", country: "US", title: "PCE Inflation (April)", category: "CPI", impact: "high" },
  { date: "2026-06-06", time: "08:30", country: "US", title: "Nonfarm Payrolls (May)", category: "Jobs", impact: "high" },
  { date: "2026-06-06", time: "08:30", country: "US", title: "Unemployment Rate (May)", category: "Jobs", impact: "high" },
  { date: "2026-06-11", time: "08:30", country: "US", title: "CPI (May)", category: "CPI", impact: "high" },
  { date: "2026-06-18", time: "14:00", country: "US", title: "FOMC Rate Decision + SEP", category: "Fed", impact: "high" },
  { date: "2026-06-18", time: "14:30", country: "US", title: "Powell Press Conference", category: "Fed", impact: "high" },
  { date: "2026-06-26", time: "08:30", country: "US", title: "PCE Inflation (May)", category: "CPI", impact: "high" },
  { date: "2026-07-03", time: "08:30", country: "US", title: "Nonfarm Payrolls (June)", category: "Jobs", impact: "high" },
  { date: "2026-07-15", time: "08:30", country: "US", title: "CPI (June)", category: "CPI", impact: "high" },
  { date: "2026-07-15", time: "—", country: "US", title: "Big Bank Earnings (JPM, WFC, C)", category: "Earnings", impact: "high" },
  { date: "2026-07-30", time: "14:00", country: "US", title: "FOMC Rate Decision", category: "Fed", impact: "high" },
  { date: "2026-07-31", time: "—", country: "US", title: "Mega-cap Earnings (AAPL, AMZN, MSFT, GOOGL, META)", category: "Earnings", impact: "high" },
  { date: "2026-08-22", time: "10:00", country: "US", title: "Jackson Hole Symposium", category: "Fed", impact: "high" },
  { date: "2026-09-17", time: "14:00", country: "US", title: "FOMC Rate Decision + SEP", category: "Fed", impact: "high" },
  // EU / global
  { date: "2026-05-14", time: "05:00", country: "EU", title: "Eurozone GDP (Flash)", category: "GDP", impact: "medium" },
  { date: "2026-06-04", time: "07:45", country: "EU", title: "ECB Rate Decision", category: "Fed", impact: "high" },
  { date: "2026-06-19", time: "07:00", country: "UK", title: "BoE Rate Decision", category: "Fed", impact: "high" },
  { date: "2026-06-12", time: "23:50", country: "JP", title: "BoJ Rate Decision", category: "Fed", impact: "high" },
];

const FILTERS: { id: Impact | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "high", label: "High impact" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

const impactDot: Record<Impact, string> = {
  high: "fill-down text-down",
  medium: "fill-yellow-500 text-yellow-500",
  low: "fill-muted-foreground text-muted-foreground",
};

const Calendar = () => {
  const [filter, setFilter] = useState<Impact | "all">("all");

  const grouped = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const visible = EVENTS.filter((e) => filter === "all" || e.impact === filter)
      .filter((e) => new Date(e.date) >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));
    const map = new Map<string, Event[]>();
    for (const e of visible) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return [...map.entries()];
  }, [filter]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Ticker />
      <div className="border-b bg-background sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="text-xl font-bold">Economic Calendar</h1>
          <div className="ml-auto flex gap-1 bg-muted rounded-md p-1 text-xs">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "px-2.5 py-1 rounded font-semibold",
                  filter === f.id ? "bg-background shadow-sm" : "text-muted-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-3xl">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md p-3 flex items-start gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <div className="text-foreground/90">
            Curated forward-looking calendar. Times shown in US Eastern. Dates are scheduled — confirm with the official source before trading.
          </div>
        </div>

        {grouped.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">No events match this filter.</p>
        )}

        {grouped.map(([date, evs]) => {
          const d = new Date(date + "T12:00:00");
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const dayMs = d.getTime() - today.getTime();
          const days = Math.round(dayMs / 86400000);
          const dayLabel = days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;
          return (
            <section key={date} className="bg-card border rounded-lg overflow-hidden">
              <header className="px-4 py-2.5 border-b bg-muted/40 flex items-baseline justify-between">
                <div>
                  <div className="font-bold">
                    {d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{dayLabel}</div>
                </div>
                <span className="text-xs text-muted-foreground">{evs.length} event{evs.length === 1 ? "" : "s"}</span>
              </header>
              <ul className="divide-y">
                {evs.map((e, i) => (
                  <li key={i} className="px-4 py-3 flex items-center gap-3">
                    <Circle className={cn("w-2.5 h-2.5 shrink-0", impactDot[e.impact])} />
                    <div className="text-xs font-mono text-muted-foreground tabular-nums w-14 shrink-0">{e.time ?? "—"}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0">
                      {e.country}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{e.title}</div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{e.category}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </main>
    </div>
  );
};

export default Calendar;
