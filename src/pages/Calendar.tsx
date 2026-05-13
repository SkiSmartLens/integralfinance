import { Header } from "@/components/Header";
import { Ticker } from "@/components/Ticker";
import { SEO } from "@/components/SEO";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

type Impact = "high" | "medium" | "low";

interface Event {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string;
  title: string;
  notes?: string;
  impact: Impact;
}

const STORAGE_KEY = "calendar.events.v1";

const impactDot: Record<Impact, string> = {
  high: "bg-down",
  medium: "bg-yellow-500",
  low: "bg-muted-foreground",
};

function loadEvents(): Event[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Event[];
  } catch {
    return [];
  }
}

const Calendar = () => {
  const [events, setEvents] = useState<Event[]>(() => loadEvents());
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Omit<Event, "id">>({
    date: new Date().toISOString().slice(0, 10),
    time: "",
    title: "",
    notes: "",
    impact: "medium",
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events]);

  const grouped = useMemo(() => {
    const sorted = [...events].sort(
      (a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "")
    );
    const map = new Map<string, Event[]>();
    for (const e of sorted) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return [...map.entries()];
  }, [events]);

  const addEvent = () => {
    if (!draft.title.trim() || !draft.date) return;
    const e: Event = { ...draft, id: crypto.randomUUID() };
    setEvents((prev) => [...prev, e]);
    setDraft({ date: draft.date, time: "", title: "", notes: "", impact: "medium" });
    setShowForm(false);
  };

  const removeEvent = (id: string) => setEvents((prev) => prev.filter((x) => x.id !== id));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Ticker />
      <div className="border-b bg-background sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="text-xl font-bold">My Calendar</h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Add Event
          </button>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-3xl">
        {showForm && (
          <section className="bg-card border rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 col-span-2">
                <span className="text-xs font-semibold text-muted-foreground">Title</span>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="e.g. AAPL earnings"
                  className="w-full px-3 py-2 bg-muted rounded text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">Date</span>
                <input
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                  className="w-full px-3 py-2 bg-muted rounded text-sm outline-none"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">Time</span>
                <input
                  type="time"
                  value={draft.time}
                  onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                  className="w-full px-3 py-2 bg-muted rounded text-sm outline-none"
                />
              </label>
              <label className="space-y-1 col-span-2">
                <span className="text-xs font-semibold text-muted-foreground">Notes</span>
                <textarea
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-muted rounded text-sm outline-none"
                />
              </label>
              <div className="col-span-2 flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Impact:</span>
                {(["low", "medium", "high"] as Impact[]).map((imp) => (
                  <button
                    key={imp}
                    type="button"
                    onClick={() => setDraft({ ...draft, impact: imp })}
                    className={cn(
                      "px-2.5 py-1 rounded text-xs font-semibold border capitalize",
                      draft.impact === imp
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {imp}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 rounded text-sm font-semibold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={addEvent}
                className="px-3 py-1.5 rounded text-sm font-semibold bg-primary text-primary-foreground"
              >
                Save
              </button>
            </div>
          </section>
        )}

        {grouped.length === 0 && !showForm && (
          <p className="text-center text-sm text-muted-foreground py-12">
            Your calendar is empty. Click <span className="font-semibold">Add Event</span> to start tracking earnings, Fed meetings, or anything else.
          </p>
        )}

        {grouped.map(([date, evs]) => {
          const d = new Date(date + "T12:00:00");
          return (
            <section key={date} className="bg-card border rounded-lg overflow-hidden">
              <header className="px-4 py-2.5 border-b bg-muted/40">
                <div className="font-bold">
                  {d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </div>
              </header>
              <ul className="divide-y">
                {evs.map((e) => (
                  <li key={e.id} className="px-4 py-3 flex items-center gap-3">
                    <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", impactDot[e.impact])} />
                    <div className="text-xs font-mono text-muted-foreground tabular-nums w-14 shrink-0">
                      {e.time || "—"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{e.title}</div>
                      {e.notes && (
                        <div className="text-xs text-muted-foreground truncate">{e.notes}</div>
                      )}
                    </div>
                    <button
                      onClick={() => removeEvent(e.id)}
                      className="p-1.5 rounded text-muted-foreground hover:text-down hover:bg-muted shrink-0"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
