import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Sparkles, ChevronDown, Loader2 } from "lucide-react";

interface Summary {
  whyMoved?: string;
  outlook?: string;
}

const cache = new Map<string, Summary>();

/**
 * Compact, collapsible "Why this stock moved today" learning panel.
 * Surfaces the AI's plain-English explanation without the heavy full report.
 */
export const WhyItMoved = ({ symbol, defaultOpen = false }: { symbol: string; defaultOpen?: boolean }) => {
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
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
        aria-expanded={open}
      >
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold">Why {symbol} moved today</span>
          <span className="block text-xs text-muted-foreground">Optional — a quick AI explanation for beginners.</span>
        </span>
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
            <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              {data?.whyMoved && <p><span className="text-foreground">{data.whyMoved}</span></p>}
              {data?.outlook && (
                <p>
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">Outlook · </span>
                  {data.outlook}
                </p>
              )}
              {!data?.whyMoved && !data?.outlook && <p>No explanation available for this stock yet.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
