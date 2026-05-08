import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, TrendingUp, TrendingDown, Calendar, Eye } from "lucide-react";

interface Summary {
  positives: string[];
  negatives: string[];
  earnings: string;
  outlook: string;
}

// Cache AI summaries by symbol so re-selecting is instant.
const summaryCache = new Map<string, Summary>();

export const StockSummary = ({ symbol }: { symbol: string }) => {
  const [data, setData] = useState<Summary | null>(summaryCache.get(symbol) ?? null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  // Defer the AI fetch until the section is near the viewport.
  useEffect(() => {
    if (visible || !ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const cached = summaryCache.get(symbol);
    if (cached) {
      setData(cached);
      setErr(null);
      return;
    }
    let alive = true;
    setData(null);
    setErr(null);
    setLoading(true);
    supabase.functions
      .invoke("stock-summary", { body: { symbol } })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setErr(error.message);
        else {
          summaryCache.set(symbol, data as Summary);
          setData(data as Summary);
        }
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [symbol, visible]);

  return (
    <section ref={ref} className="bg-card border rounded-lg p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold">AI Insights · {symbol}</h3>
      </div>
      {loading && <div className="text-sm text-muted-foreground py-4">Analyzing latest signals…</div>}
      {err && <div className="text-sm text-down py-2">{err}</div>}
      {data && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-muted/40 rounded-md p-3">
            <div className="flex items-center gap-2 mb-2 font-semibold text-up">
              <TrendingUp className="w-4 h-4" /> Positives
            </div>
            <ul className="text-sm space-y-1.5 list-disc pl-5">
              {data.positives?.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
          <div className="bg-muted/40 rounded-md p-3">
            <div className="flex items-center gap-2 mb-2 font-semibold text-down">
              <TrendingDown className="w-4 h-4" /> Risks
            </div>
            <ul className="text-sm space-y-1.5 list-disc pl-5">
              {data.negatives?.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
          <div className="bg-muted/40 rounded-md p-3">
            <div className="flex items-center gap-2 mb-2 font-semibold">
              <Calendar className="w-4 h-4" /> Earnings
            </div>
            <p className="text-sm">{data.earnings}</p>
          </div>
          <div className="bg-muted/40 rounded-md p-3">
            <div className="flex items-center gap-2 mb-2 font-semibold">
              <Eye className="w-4 h-4" /> Outlook
            </div>
            <p className="text-sm">{data.outlook}</p>
          </div>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground mt-3">
        AI-generated synthesis of public news and quote data. Not financial advice.
      </p>
    </section>
  );
};
