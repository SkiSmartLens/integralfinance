import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { formatLargeNumber, formatNumber } from "@/lib/yahoo";
import { BookOpen } from "lucide-react";
import { Term } from "./Glossary";

interface Explainer {
  whatItDoes: string;
  whyPeopleBuy: string;
  whatToWatch: string;
}

const cache = new Map<string, Explainer>();
const CACHE_VER = "v2";

/** Plain-English "What is this stock?" card aimed at first-time investors. */
export const StockExplainer = ({ symbol }: { symbol: string }) => {
  const [data, setData] = useState<Explainer | null>(cache.get(symbol) ?? null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const { quotes } = useLiveQuotes([symbol], 30000);
  const q = quotes[0];

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      (e) => e.some((x) => x.isIntersecting) && (setVisible(true), io.disconnect()),
      { rootMargin: "150px" }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const cached = cache.get(symbol);
    if (cached) {
      setData(cached);
      return;
    }
    let alive = true;
    setData(null);
    setLoading(true);
    supabase.functions
      .invoke("stock-summary", { body: { symbol, mode: "beginner" } })
      .then(({ data }) => {
        if (!alive || !data) return;
        if ((data as any).whatItDoes) {
          cache.set(symbol, data as Explainer);
          setData(data as Explainer);
        }
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [symbol, visible]);

  return (
    <section ref={ref} className="bg-card border rounded-lg p-5 md:p-6">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold">
          What is {q?.shortName || symbol}?
        </h3>
      </div>

      {loading && !data && (
        <p className="text-sm text-muted-foreground">Loading a plain-English explanation…</p>
      )}

      {data && (
        <div className="space-y-3 text-sm leading-relaxed">
          <p>
            <span className="font-semibold">In a nutshell · </span>
            {data.whatItDoes}
          </p>
          <p>
            <span className="font-semibold">Why people buy it · </span>
            {data.whyPeopleBuy}
          </p>
          <p>
            <span className="font-semibold">Things to watch · </span>
            {data.whatToWatch}
          </p>
        </div>
      )}

      {/* Beginner-friendly key stats with hover tooltips */}
      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <Stat label={<Term term="Market Cap" />} value={formatLargeNumber(q?.marketCap)} />
        <Stat
          label={<Term term="52-Week Range" />}
          value={
            q?.fiftyTwoWeekLow != null
              ? `${formatNumber(q.fiftyTwoWeekLow)} – ${formatNumber(q.fiftyTwoWeekHigh)}`
              : "—"
          }
        />
        <Stat label={<Term term="Volume" />} value={formatLargeNumber(q?.regularMarketVolume)} />
        <Stat
          label={<Term term="P/E Ratio" />}
          value={q?.trailingPE != null ? formatNumber(q.trailingPE) : "—"}
        />
      </div>

    </section>
  );
};

const Stat = ({ label, value }: { label: React.ReactNode; value: string }) => (
  <div className="bg-muted/40 rounded-md p-3">
    <div className="text-muted-foreground mb-1">{label}</div>
    <div className="font-semibold tabular-nums text-sm">{value}</div>
  </div>
);
