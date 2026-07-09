import { useEffect, useState } from "react";
import { supabase } from "@/lib/backend";
import { cn } from "@/lib/utils";
import { Sparkles, ChevronDown, Loader2, ThumbsUp, ThumbsDown } from "lucide-react";

interface Summary {
  whyMoved?: string;
  outlook?: string;
}

const cache = new Map<string, Summary>();

/**
 * Compact, collapsible "Why this stock moved today" learning panel.
 * Uses sentiment (up/down for the day) to visually frame the AI explanation
 * as a bullish (green) or bearish (red) card with a thumbs icon.
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
  const bullish = (changePct ?? 0) >= 0;
  const [open, setOpen] = useState(defaultOpen);
  const [data, setData] = useState<Summary | null>(cache.get(symbol) ?? null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setData(cache.get(symbol) ?? null);
    setErr(null);
  }, [symbol]);

  useEffect(() => {
    if (!open || data || cache.get(symbol)) return;
    let alive = true;
    setLoading(true);
    setErr(null);
    supabase.functions
      .invoke("stock-summary", { body: { symbol } })
      .then(({ data: d, error }) => {
        if (!alive) return;
        if (error) {
          setErr("Couldn't load an explanation right now.");
        } else {
          cache.set(symbol, d as Summary);
          setData(d as Summary);
        }
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [open, symbol, data]);

  return (
    <div
      className={cn(
        "rounded-2xl border-2 overflow-hidden transition-colors",
        bullish
          ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/20"
          : "border-rose-200 bg-rose-50/50 dark:border-rose-900/60 dark:bg-rose-950/20",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        aria-expanded={open}
      >
        <span
          className={cn(
            "shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
            bullish ? "bg-emerald-500 text-white" : "bg-rose-400 text-white",
          )}
        >
          {bullish ? <ThumbsUp className="w-4 h-4" /> : <ThumbsDown className="w-4 h-4" />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-extrabold">
            {bullish ? "Bullish take on " : "Bearish take on "}
            {symbol}
          </span>
          <span className="block text-xs text-muted-foreground">
            AI explanation — tap to {open ? "hide" : "read"}.
          </span>
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
            <div className="space-y-2 text-sm leading-relaxed text-foreground/90">
              {data?.whyMoved && <p>{data.whyMoved}</p>}
              {data?.outlook && (
                <p>
                  <span className={cn("text-xs font-bold uppercase tracking-wider", bullish ? "text-emerald-700" : "text-rose-700")}>Outlook · </span>
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
