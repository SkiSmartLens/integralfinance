import { useEffect, useState } from "react";
import { fetchStockSummary, getCachedSummary, stanceLabel, stanceTone, type StockSummaryData } from "@/lib/stockSummary";
import { cn } from "@/lib/utils";
import { CitedText } from "@/components/CitedText";
import { BullBearSpectrum } from "@/components/BullBearSpectrum";

import { Sparkles, ChevronDown, Loader2, TrendingUp, TrendingDown, Scale } from "lucide-react";

type Summary = StockSummaryData;

const TONES = {
  up: {
    card: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/20",
    badge: "bg-emerald-500 text-white",
    text: "text-emerald-700 dark:text-emerald-400",
    Icon: TrendingUp,
  },
  down: {
    card: "border-rose-200 bg-rose-50/50 dark:border-rose-900/60 dark:bg-rose-950/20",
    badge: "bg-rose-400 text-white",
    text: "text-rose-700 dark:text-rose-400",
    Icon: TrendingDown,
  },
  neutral: {
    card: "border-border bg-muted/30",
    badge: "bg-muted-foreground/70 text-white",
    text: "text-muted-foreground",
    Icon: Scale,
  },
} as const;

/**
 * Compact, collapsible AI take on a stock. The header places it on a
 * bearish-to-bullish spectrum (the AI weighing the bull case against the bear
 * case); the body explains today's move. Until a score is available it falls
 * back to framing the card by today's move alone.
 */
export const WhyItMoved = ({
  symbol,
  changePct,
  defaultOpen = false,
}: {
  symbol: string;
  changePct?: number;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  // "priority" carries whyMoved, outlook and the stance score (the fields this
  // card needs) and renders as soon as the small, fast call resolves — it
  // shares its cache with StockSummary's priority fetch, so this is often an
  // instant cache hit.
  const [data, setData] = useState<Summary | null>(getCachedSummary(symbol, "priority"));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Load eagerly so the take shows in the header before the card is opened.
  useEffect(() => {
    let alive = true;
    const cached = getCachedSummary(symbol, "priority");
    setData(cached);
    setErr(null);
    if (cached) return;
    setLoading(true);
    fetchStockSummary(symbol, "priority")
      .then((d) => { if (alive) setData(d); })
      .catch(() => { if (alive) setErr("Couldn't load an explanation right now."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [symbol]);

  const score = typeof data?.stanceScore === "number" ? data.stanceScore : null;
  const upToday = (changePct ?? 0) >= 0;
  const tone = TONES[score != null ? stanceTone(score) : upToday ? "up" : "down"];

  return (
    <div className={cn("rounded-2xl border-2 overflow-hidden transition-colors", tone.card)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        aria-expanded={open}
      >
        <span className={cn("shrink-0 w-9 h-9 rounded-full flex items-center justify-center", tone.badge)}>
          <tone.Icon className="w-4 h-4" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-extrabold">
            {score != null ? (
              <>
                AI take on {symbol}: <span className={tone.text}>{stanceLabel(score)}</span>
              </>
            ) : (
              `Why ${symbol} is ${upToday ? "up" : "down"} today`
            )}
          </span>
          {score != null ? (
            <BullBearSpectrum score={score} compact className="mt-2 mb-1 max-w-[240px]" />
          ) : (
            <span className="block text-xs text-muted-foreground">
              AI explanation — tap to {open ? "hide" : "read"}.
            </span>
          )}
        </span>
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-4 pb-4 animate-fade-in">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
            </div>
          ) : err ? (
            <p className="text-sm text-muted-foreground">{err}</p>
          ) : (
            <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
              {score != null && (
                <BullBearSpectrum score={score} reason={data?.stanceReason} className="rounded-xl bg-background/70 border p-3" />
              )}
              {data?.whyMoved && (
                <div>
                  <p className={cn("text-xs font-bold uppercase tracking-wider mb-1", TONES[upToday ? "up" : "down"].text)}>
                    Why it's {upToday ? "up" : "down"} today
                  </p>
                  <p><CitedText text={data.whyMoved} sources={data.sources} /></p>
                </div>
              )}
              {data?.outlook && (
                <p>
                  <span className={cn("text-xs font-bold uppercase tracking-wider", tone.text)}>Outlook · </span>
                  <span className="text-muted-foreground">{data.outlook}</span>
                </p>
              )}
              {!data?.whyMoved && !data?.outlook && <p className="text-muted-foreground">No explanation available yet.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
