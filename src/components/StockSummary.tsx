import { useEffect, useRef, useState } from "react";
import { fetchStockSummary, getCachedSummary, type StockSummaryData } from "@/lib/stockSummary";
import { fetchQuotes } from "@/lib/yahoo";
import { cn } from "@/lib/utils";
import { CitedText } from "@/components/CitedText";
import { useLiveNews } from "@/hooks/useLiveNews";
import { timeAgo } from "@/lib/marketBrief";
import { BullBearSpectrum } from "@/components/BullBearSpectrum";

import { Sparkles, TrendingUp, TrendingDown, Calendar, Eye, BarChart3, DollarSign, Percent, Landmark, Shield, LineChart, ChevronDown, Zap, Newspaper, ExternalLink } from "lucide-react";


interface Source { title: string; publisher: string; url: string }
type Summary = StockSummaryData & { positives: string[]; negatives: string[]; earnings: string; outlook: string };


const nameCache = new Map<string, string>();

export const StockSummary = ({ symbol }: { symbol: string }) => {
  const [data, setData] = useState<Summary | null>(() => {
    const priority = getCachedSummary(symbol, "priority");
    const extended = getCachedSummary(symbol, "extended");
    return priority || extended ? ({ ...extended, ...priority } as Summary) : null;
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>(nameCache.get(symbol) ?? "");
  const [nextEarnings, setNextEarnings] = useState<string>("");
  const ref = useRef<HTMLElement | null>(null);


  // Look up the company name + next earnings.
  useEffect(() => {
    const cached = nameCache.get(symbol);
    if (cached) setCompanyName(cached); else setCompanyName("");
    setNextEarnings("");
    let alive = true;
    fetchQuotes([symbol]).then((qs) => {
      if (!alive) return;
      const q = qs[0];
      const name = q?.longName || q?.shortName || "";
      if (name) { nameCache.set(symbol, name); setCompanyName(name); }
      const ts = q?.earningsTimestampStart ?? q?.earningsTimestamp;
      if (typeof ts === "number" && ts > 0) {
        const d = new Date(ts * 1000);
        const diffDays = Math.round((d.getTime() - Date.now()) / 86400000);
        const fmt = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
        const rel = diffDays > 0 ? ` (in ${diffDays} day${diffDays === 1 ? "" : "s"})`
          : diffDays === 0 ? " (today)"
          : ` (${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} ago)`;
        setNextEarnings(`${fmt}${rel}`);
      }
    }).catch(() => {});
    return () => { alive = false; };
  }, [symbol]);

  // Fetch AI insights immediately (shared cache + request dedupe).
  // "priority" carries whyMoved/positives/negatives/whatItDoes/outlook — the
  // fields rendered first — and "extended" carries the deep-dive fields
  // (revenue, margins, moat, forecast, ...) rendered further down in collapsed
  // rows. They're independent AI calls so priority can render as soon as it's
  // ready instead of waiting on the much larger extended payload.
  useEffect(() => {
    let alive = true;
    setErr(null);
    setData(null);

    const cachedPriority = getCachedSummary(symbol, "priority") as Summary | null;
    if (cachedPriority) {
      setData((d) => ({ ...d, ...cachedPriority }) as Summary);
    } else {
      setLoading(true);
      fetchStockSummary(symbol, "priority")
        .then((d) => { if (alive) setData((prev) => ({ ...prev, ...d }) as Summary); })
        .catch((e: Error) => { if (alive) setErr(e.message); })
        .finally(() => { if (alive) setLoading(false); });
    }

    const cachedExtended = getCachedSummary(symbol, "extended") as Summary | null;
    if (cachedExtended) {
      setData((d) => ({ ...d, ...cachedExtended }) as Summary);
    } else {
      fetchStockSummary(symbol, "extended")
        .then((d) => { if (alive) setData((prev) => ({ ...prev, ...d }) as Summary); })
        .catch(() => { /* deep-dive fields are non-critical; fail silently */ });
    }

    return () => { alive = false; };
  }, [symbol]);


  // The articles the AI was given, then recent stories about the company that it
  // wasn't (the same ones as the stock's News tab), as further reading.
  const sources = (data?.sources ?? []).filter((s) => s.url);
  const { news } = useLiveNews([symbol, companyName]);
  const sourceUrls = new Set(sources.map((s) => s.url));
  const coverage = news.filter((n) => !sourceUrls.has(n.link)).slice(0, 5);

  const askIntegral = (question?: string) => {
    const who = companyName ? `${companyName} (${symbol})` : symbol;
    const prompt = question ?? `Tell me everything important about ${who}: predicted revenue, earnings growth, margins, balance sheet, competitive moat, valuation and 12-month outlook.`;
    window.dispatchEvent(new CustomEvent("integral-ai-open", { detail: { prompt } }));
  };

  return (
    <section ref={ref} className="bg-card border rounded-lg p-4 md:p-6">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold">AI Insights · {companyName || symbol}</h3>
        </div>
        <button
          onClick={() => askIntegral()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
          title={`Ask Integral AI about ${companyName || symbol}`}
        >
          <Sparkles className="w-3.5 h-3.5" /> Ask Integral AI
        </button>
      </div>
      {loading && !data && (
        <div className="text-sm text-muted-foreground py-2">Generating AI insights…</div>
      )}
      {err && !data && (
        <div className="text-sm bg-muted/40 rounded-md p-3 text-muted-foreground">
          {/credit/i.test(err)
            ? "AI insights are temporarily unavailable — the AI usage limit has been reached. Please try again later."
            : /rate limit/i.test(err)
            ? "Too many requests right now. Please try again in a moment."
            : "AI insights couldn’t be loaded right now. Please try again later."}
        </div>
      )}
      {data && (
        <div className="space-y-2">
          {data.whyMoved && (
            <CollapsibleRow icon={<Zap className="w-4 h-4 text-primary" />} title="Why did this stock move today?" defaultOpen>
              <p className="text-sm leading-relaxed"><CitedText text={data.whyMoved} sources={data.sources} /></p>
              {data.sources && data.sources.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-2">Grounded in live web articles — tap a number to read the source.</p>
              )}
            </CollapsibleRow>
          )}

          <BullBear data={data} />
          {data.predictedRevenue && (
            <CollapsibleRow icon={<DollarSign className="w-4 h-4 text-primary" />} title="Predicted revenue (estimate)">
              <p className="text-2xl font-extrabold text-primary">{data.predictedRevenue}</p>
              <p className="text-xs text-muted-foreground mt-1">Estimated next-year total revenue · AI approximation, not a guarantee.</p>
            </CollapsibleRow>
          )}
          {data.revenueGrowth && (
            <CollapsibleRow icon={<BarChart3 className="w-4 h-4 text-primary" />} title="Revenue growth">
              <p className="text-sm">{data.revenueGrowth}</p>
            </CollapsibleRow>
          )}
          {data.earningsGrowth && (
            <CollapsibleRow icon={<DollarSign className="w-4 h-4 text-primary" />} title="Earnings growth">
              <p className="text-sm">{data.earningsGrowth}</p>
            </CollapsibleRow>
          )}
          {data.margins && (
            <CollapsibleRow icon={<Percent className="w-4 h-4 text-primary" />} title="Profit margins">
              <p className="text-sm">{data.margins}</p>
            </CollapsibleRow>
          )}
          {data.balanceSheet && (
            <CollapsibleRow icon={<Landmark className="w-4 h-4 text-primary" />} title="Balance sheet & debt">
              <p className="text-sm">{data.balanceSheet}</p>
            </CollapsibleRow>
          )}
          {data.moat && (
            <CollapsibleRow icon={<Shield className="w-4 h-4 text-primary" />} title="Competitive edge / moat">
              <p className="text-sm">{data.moat}</p>
            </CollapsibleRow>
          )}
          <CollapsibleRow icon={<Calendar className="w-4 h-4 text-primary" />} title="Earnings">
            {nextEarnings && (
              <p className="text-xs font-bold mb-1">
                Next report: <span className="text-primary">{nextEarnings}</span>
              </p>
            )}
            <p className="text-sm">{data.earnings}</p>
          </CollapsibleRow>
          {data.forecast && (
            <CollapsibleRow icon={<LineChart className="w-4 h-4 text-primary" />} title="12-month forecast">
              <p className="text-sm">{data.forecast}</p>
            </CollapsibleRow>
          )}
          <CollapsibleRow icon={<Eye className="w-4 h-4 text-primary" />} title="Outlook">
            <p className="text-sm">{data.outlook}</p>
          </CollapsibleRow>
          {(sources.length > 0 || coverage.length > 0) && (
            <div className="bg-muted/40 rounded-md p-3">
              <h4 className="flex items-center gap-2 font-semibold mb-3">
                <Newspaper className="w-4 h-4 text-primary" /> Sources
              </h4>
              {sources.length > 0 && (
                <>
                  <SourceList items={sources.map((s) => ({ title: s.title, url: s.url, meta: s.publisher }))} />
                  <p className="text-[11px] text-muted-foreground mt-3">
                    The AI insights above are based on these recently published articles about the company.
                  </p>
                </>
              )}
              {coverage.length > 0 && (
                <div className={cn(sources.length > 0 && "mt-4 pt-3 border-t")}>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    Latest news about {companyName || symbol}
                  </p>
                  <SourceList
                    items={coverage.map((n) => ({ title: n.title, url: n.link, meta: `${n.publisher} · ${timeAgo(n.providerPublishTime)}` }))}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

// Points shown per side before "Show all".
const TOP_POINTS = 3;

/**
 * Where the stock sits between its bear case and bull case, then both cases
 * side by side, strongest points first. Points past the first few are hidden
 * until "Show all", but stay in the DOM so search engines index them.
 */
const BullBear = ({ data }: { data: Summary }) => {
  const [showAll, setShowAll] = useState(false);
  const positives = data.positives ?? [];
  const negatives = data.negatives ?? [];
  const extra = Math.max(0, positives.length - TOP_POINTS) + Math.max(0, negatives.length - TOP_POINTS);
  const side = (title: string, subtitle: string, icon: React.ReactNode, points: string[]) => (
    <div>
      <h4 className="flex items-center gap-2 font-semibold">
        {icon} {title}
      </h4>
      <p className="text-xs text-muted-foreground mb-2">{subtitle}</p>
      <ul className="text-sm space-y-1.5 list-disc pl-5">
        {points.map((p, i) => (
          <li key={i} hidden={!showAll && i >= TOP_POINTS}>
            <CitedText text={p} sources={data.sources} />
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <div className="bg-muted/40 rounded-md p-3 md:p-4 space-y-4">
      {typeof data.stanceScore === "number" && (
        <BullBearSpectrum score={data.stanceScore} reason={data.stanceReason} />
      )}
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {side("Bull case", "Why investors buy it", <TrendingUp className="w-4 h-4 text-up" />, positives)}
        {side("Bear case", "What could go wrong", <TrendingDown className="w-4 h-4 text-down" />, negatives)}
      </div>
      {extra > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="text-xs font-semibold text-primary hover:underline"
        >
          {showAll ? "Show fewer points" : `Show ${extra} more point${extra === 1 ? "" : "s"}`}
        </button>
      )}
    </div>
  );
};

const SourceList = ({ items }: { items: { title: string; url: string; meta: string }[] }) => (
  <ul className="space-y-2 text-sm">
    {items.map((s) => (
      <li key={s.url} className="flex items-start gap-2">
        <ExternalLink className="w-3.5 h-3.5 mt-1 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold hover:underline break-words">
            {s.title}
          </a>
          <div className="text-xs text-muted-foreground">{s.meta}</div>
        </div>
      </li>
    ))}
  </ul>
);

const CollapsibleRow = ({
  icon, title, children, defaultOpen = false,
}: { icon: React.ReactNode; title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-muted/40 rounded-md overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 p-3 text-left font-semibold"
      >
        <span className="flex items-center gap-2">{icon} {title}</span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {/* Always in the DOM (just hidden when collapsed) so search engines index the insight text. */}
      <div hidden={!open} className="px-3 pb-3 -mt-1">{children}</div>
    </div>
  );
};
