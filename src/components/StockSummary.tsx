import { useEffect, useRef, useState } from "react";
import {
  citedSources,
  fetchBullBear,
  fetchStockSummary,
  getCachedBullBear,
  getCachedSummary,
  hasInsight,
  researchedFrom,
  type BullBearCase,
  type StockSummaryData,
} from "@/lib/stockSummary";
import { BULL_BEAR_STEPS } from "@/lib/aiProgress";
import { fetchQuotes } from "@/lib/yahoo";
import { cn } from "@/lib/utils";
import { CitedText } from "@/components/CitedText";
import { useLiveNews } from "@/hooks/useLiveNews";
import { timeAgo } from "@/lib/marketBrief";
import { BullBearSpectrum } from "@/components/BullBearSpectrum";
import { AiProgress } from "@/components/AiProgress";

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
  const [bullBear, setBullBear] = useState<BullBearCase | null>(() => getCachedBullBear(symbol));
  const [bullBearFailed, setBullBearFailed] = useState(false);
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


  // The researched bull and bear case comes from its own function. It starts once
  // the summary's first call has settled, so the two don't compete for the AI's
  // per-minute budget on a stock nobody has looked at recently.
  useEffect(() => {
    let alive = true;
    const cached = getCachedBullBear(symbol);
    setBullBear(cached);
    setBullBearFailed(false);
    if (cached) return;
    const first = getCachedSummary(symbol, "priority") ? Promise.resolve() : fetchStockSummary(symbol, "priority").then(() => {}, () => {});
    first
      .then(() => fetchBullBear(symbol))
      .then((c) => { if (alive) setBullBear(c); })
      .catch(() => { if (alive) setBullBearFailed(true); });
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
      {loading && !data && <AiProgress className="bg-muted/40 rounded-md p-3" />}
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

          <CollapsibleRow icon={<BarChart3 className="w-4 h-4 text-primary" />} title="Bull & bear case">
            <BullBear data={data} bullBear={bullBear} failed={bullBearFailed} company={companyName || symbol} />
          </CollapsibleRow>
          {hasInsight(data.predictedRevenue) && (
            <CollapsibleRow icon={<DollarSign className="w-4 h-4 text-primary" />} title="Predicted revenue (estimate)">
              <p className="text-2xl font-extrabold text-primary">{data.predictedRevenue}</p>
              <p className="text-xs text-muted-foreground mt-1">Estimated next-year total revenue · AI approximation, not a guarantee.</p>
            </CollapsibleRow>
          )}
          {hasInsight(data.revenueGrowth) && (
            <CollapsibleRow icon={<BarChart3 className="w-4 h-4 text-primary" />} title="Revenue growth">
              <p className="text-sm">{data.revenueGrowth}</p>
            </CollapsibleRow>
          )}
          {hasInsight(data.earningsGrowth) && (
            <CollapsibleRow icon={<DollarSign className="w-4 h-4 text-primary" />} title="Earnings growth">
              <p className="text-sm">{data.earningsGrowth}</p>
            </CollapsibleRow>
          )}
          {hasInsight(data.margins) && (
            <CollapsibleRow icon={<Percent className="w-4 h-4 text-primary" />} title="Profit margins">
              <p className="text-sm">{data.margins}</p>
            </CollapsibleRow>
          )}
          {hasInsight(data.balanceSheet) && (
            <CollapsibleRow icon={<Landmark className="w-4 h-4 text-primary" />} title="Balance sheet & debt">
              <p className="text-sm">{data.balanceSheet}</p>
            </CollapsibleRow>
          )}
          {hasInsight(data.moat) && (
            <CollapsibleRow icon={<Shield className="w-4 h-4 text-primary" />} title="Competitive edge / moat">
              <p className="text-sm">{data.moat}</p>
            </CollapsibleRow>
          )}
          {(hasInsight(data.earnings) || nextEarnings) && (
            <CollapsibleRow icon={<Calendar className="w-4 h-4 text-primary" />} title="Earnings">
              {nextEarnings && (
                <p className="text-xs font-bold mb-1">
                  Next report: <span className="text-primary">{nextEarnings}</span>
                </p>
              )}
              {hasInsight(data.earnings) && <p className="text-sm">{data.earnings}</p>}
            </CollapsibleRow>
          )}
          {hasInsight(data.forecast) && (
            <CollapsibleRow icon={<LineChart className="w-4 h-4 text-primary" />} title="12-month forecast">
              <p className="text-sm">{data.forecast}</p>
            </CollapsibleRow>
          )}
          {hasInsight(data.outlook) && (
            <CollapsibleRow icon={<Eye className="w-4 h-4 text-primary" />} title="Outlook">
              <p className="text-sm">{data.outlook}</p>
            </CollapsibleRow>
          )}
          {(sources.length > 0 || coverage.length > 0) && (
            <CollapsibleRow
              icon={<Newspaper className="w-4 h-4 text-primary" />}
              title={`Sources (${sources.length + coverage.length} articles)`}
            >
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
            </CollapsibleRow>
          )}
        </div>
      )}
    </section>
  );
};

// Points shown per side before "Show all".
const TOP_POINTS = 3;

/**
 * The bull and bear case, laid out like Morningstar's "Bulls Say / Bears Say":
 * where the AI comes down between the two, then each side's titled points,
 * strongest first, with links to what they're based on. Points past the first
 * few are hidden until "Show all", but stay in the DOM so search engines index
 * them. While the researched case loads this shows its progress; if it can't
 * load, the summary's shorter positives and negatives stand in.
 */
const BullBear = ({
  data,
  bullBear,
  failed,
  company,
}: {
  data: Summary;
  bullBear: BullBearCase | null;
  failed: boolean;
  company: string;
}) => {
  const [showAll, setShowAll] = useState(false);
  if (!bullBear) {
    if (!failed) return <AiProgress steps={BULL_BEAR_STEPS} className="py-2" />;
    return <SummaryBullBear data={data} />;
  }

  const hasScore = typeof bullBear.stanceScore === "number";
  const score = hasScore ? bullBear.stanceScore : data.stanceScore;
  const reason = hasScore ? bullBear.stanceReason : data.stanceReason;
  const extra = Math.max(0, bullBear.bull.length - TOP_POINTS) + Math.max(0, bullBear.bear.length - TOP_POINTS);
  const cited = citedSources(bullBear);
  const basis = researchedFrom(bullBear, company);
  const asOf = bullBear.asOf ? Date.parse(bullBear.asOf) / 1000 : NaN;

  const side = (bull: boolean) => {
    const points = bull ? bullBear.bull : bullBear.bear;
    return (
      <div>
        <h4 className={cn("flex items-center gap-2 font-bold", bull ? "text-up" : "text-down")}>
          {bull ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {bull ? "Bulls say" : "Bears say"}
        </h4>
        <p className="text-xs text-muted-foreground mb-2">{bull ? "Why investors own it" : "What could go wrong"}</p>
        <ol className="space-y-2">
          {points.map((p, i) => (
            <li
              key={i}
              hidden={!showAll && i >= TOP_POINTS}
              className={cn(
                "rounded-md border border-l-4 bg-background/70 p-3",
                bull ? "border-l-[hsl(var(--chart-up))]" : "border-l-[hsl(var(--chart-down))]",
              )}
            >
              <p className="text-sm font-semibold leading-snug">{p.title}</p>
              <p className="text-sm leading-relaxed text-foreground/85 mt-1">
                <CitedText text={p.detail} sources={bullBear.sources} />
              </p>
            </li>
          ))}
        </ol>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {typeof score === "number" && <BullBearSpectrum score={score} reason={reason} />}
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {side(true)}
        {side(false)}
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
      {(basis || cited.length > 0) && (
        <div className="border-t pt-3 text-[11px] text-muted-foreground space-y-1.5">
          {basis && (
            <p>
              {basis}
              {Number.isFinite(asOf) && ` Updated ${timeAgo(asOf)}.`}
            </p>
          )}
          {cited.length > 0 && (
            <ol className="space-y-0.5">
              {cited.map(({ n, source }) => (
                <li key={n} className="break-words">
                  [{n}]{" "}
                  <a href={source.url} target="_blank" rel="noopener noreferrer nofollow" className="hover:underline text-foreground/80">
                    {source.title}
                  </a>{" "}
                  · {source.publisher}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
};

/** The summary's own positives and negatives, for when the researched case can't load. */
const SummaryBullBear = ({ data }: { data: Summary }) => {
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
            {/* Older summaries tag points with made-up sources like "[SEC]" or "[Data]". */}
            <CitedText text={p.replace(/\s*\[(?!\d+\])[^\]]{1,30}\]/g, "")} sources={data.sources} />
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <div className="space-y-4">
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
