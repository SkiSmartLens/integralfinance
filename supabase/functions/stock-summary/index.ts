const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Bump when the prompt or response schema changes: invalidates both cache levels.
const CACHE_VERSION = "v9";

// Level 1: per-instance memory. Level 2: public.stock_summary_cache, shared across
// instances (edge instances are short-lived, so level 1 alone was mostly cold).
const cache = new Map<string, { exp: number; body: string }>();

const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const db = SERVICE_ROLE
  ? createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_ROLE, { auth: { persistSession: false } })
  : null;

const HOUR = 60 * 60 * 1000;
const ET_CLOCK = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** 4:00am–8:00pm ET, Mon–Fri: pre-market through after-hours, when prices and news move. */
function inTradingDay(d: Date): boolean {
  const parts = ET_CLOCK.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = get("weekday");
  if (weekday === "Sat" || weekday === "Sun") return false;
  const minutes = (Number(get("hour")) % 24) * 60 + Number(get("minute"));
  return minutes >= 4 * 60 && minutes < 20 * 60;
}

/**
 * When a freshly generated summary goes stale. "Why it moved" content is intraday,
 * so it lives 2h while anything can move (after-hours earnings included). Overnight
 * and on weekends nothing changes, so it's held until the next pre-market opens.
 * "extended" is fundamentals (revenue, margins, moat), which don't move intraday.
 */
function expiryFor(mode: string, now = Date.now()): number {
  if (mode === "extended") return now + 12 * HOUR;
  if (inTradingDay(new Date(now))) return now + 2 * HOUR;
  const step = 15 * 60 * 1000;
  for (let t = now + step; t < now + 72 * HOUR; t += step) {
    if (inTradingDay(new Date(t))) return t;
  }
  return now + 2 * HOUR;
}

/** Level-2 lookup. Any failure is just a miss — the cache must never break a request. */
async function readStored(symbol: string, mode: string): Promise<{ body: string; exp: number } | null> {
  if (!db) return null;
  try {
    const { data, error } = await db
      .from("stock_summary_cache")
      .select("body, expires_at")
      .eq("symbol", symbol)
      .eq("mode", mode)
      .eq("version", CACHE_VERSION)
      .gt("expires_at", new Date().toISOString())
      .abortSignal(AbortSignal.timeout(1500))
      .maybeSingle();
    if (error) {
      console.error("summary cache read failed", error.message);
      return null;
    }
    return data ? { body: JSON.stringify(data.body), exp: Date.parse(data.expires_at) } : null;
  } catch (e) {
    console.error("summary cache read threw", e instanceof Error ? e.message : e);
    return null;
  }
}

// Only persist real tickers and known modes, so arbitrary request input can't grow the table.
const STORABLE_MODES = new Set(["priority", "extended", "beginner", "full"]);
const STORABLE_SYMBOL = /^[A-Z0-9^=.\-]{1,20}$/;

async function writeStored(symbol: string, mode: string, body: unknown, exp: number) {
  if (!db || !STORABLE_MODES.has(mode) || !STORABLE_SYMBOL.test(symbol)) return;
  try {
    const { error } = await db
      .from("stock_summary_cache")
      .upsert(
        {
          symbol,
          mode,
          version: CACHE_VERSION,
          body,
          expires_at: new Date(exp).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "symbol,mode" },
      )
      .abortSignal(AbortSignal.timeout(2000));
    if (error) console.error("summary cache write failed", error.message);
  } catch (e) {
    console.error("summary cache write threw", e instanceof Error ? e.message : e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Public endpoint: AI insights are readable by anyone (no sign-in required).


    const { symbol, mode } = await req.json();
    if (!symbol || typeof symbol !== "string") {
      return new Response(JSON.stringify({ error: "symbol required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sym = symbol.toUpperCase();
    const isBeginner = mode === "beginner";
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/New_York",
    });
    // "priority" = whyMoved/positives/negatives/whatItDoes/outlook — the fields the
    // UI renders first. "extended" = the deep-dive fields (revenue, margins, moat,
    // forecast, ...) that render further down in collapsed rows. Splitting these into
    // two independent, parallel AI calls (instead of one call generating all 13
    // fields serially) lets the client show the insights people actually look at —
    // why it moved, positives, negatives — without waiting on the rest. Omitting
    // `mode` keeps the old single-shot "full" behavior for any other caller.
    const isPriority = mode === "priority";
    const isExtended = mode === "extended";
    const modeKey = typeof mode === "string" ? mode : "full";
    const key = `sum:${CACHE_VERSION}:${modeKey}:${sym}`;
    const hit = cache.get(key);
    if (hit && hit.exp > Date.now()) {
      return new Response(hit.body, {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "hit" },
      });
    }
    const stored = await readStored(sym, modeKey);
    if (stored) {
      cache.set(key, stored);
      return new Response(stored.body, {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "db-hit" },
      });
    }


    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY missing");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    // Fire the quote, the ticker news search and the web search all at once —
    // they don't depend on each other, so this cuts ~2 round trips of latency.
    const quotePromise = fetch(
      `${SUPABASE_URL}/functions/v1/yahoo-proxy?kind=quote&symbols=${sym}`,
      { headers: { apikey: anon } },
    ).then((r) => r.json()).catch(() => ({}));

    const newsPromise = fetch(
      `${SUPABASE_URL}/functions/v1/yahoo-proxy?kind=search&q=${encodeURIComponent(sym)}`,
      { headers: { apikey: anon } },
    ).then((r) => r.json()).catch(() => ({}));

    // Revenue, margins, debt and cash from the company's SEC filings; nothing
    // for funds, crypto and non-US stocks.
    const fundamentalsPromise: Promise<string[]> = isBeginner
      ? Promise.resolve([])
      : fetch(`${SUPABASE_URL}/functions/v1/yahoo-proxy?kind=fundamentals&symbol=${encodeURIComponent(sym)}`, {
          headers: { apikey: anon },
          signal: AbortSignal.timeout(12000),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((j) => (Array.isArray(j?.lines) ? j.lines : []))
          .catch(() => []);

    // Firecrawl web search — real, recent articles about why the stock moved,
    // plus a second pass for bull/bear/analyst-outlook material so the
    // positives/negatives bullets can be grounded and cited too.
    // Latency: scraping full article markdown is the slowest part, so only the
    // "why it moved" pass scrapes; the bull/bear pass uses search snippets.
    // Both are hard-capped so a slow Firecrawl can never stall the response.
    // Only whyMoved/positives/negatives (priority + legacy full) cite sources, so
    // "extended" and "beginner" skip Firecrawl entirely — that's the single
    // biggest latency item (up to 9s x2) and those modes don't need it.
    const needsWebResearch = !isBeginner && !isExtended;
    const fcSearch = (query: string, tbs?: string, scrape = false) =>
      FIRECRAWL_API_KEY
        ? fetch("https://api.firecrawl.dev/v2/search", {
            method: "POST",
            headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              query,
              limit: 3,
              ...(tbs ? { tbs } : {}),
              ...(scrape ? { scrapeOptions: { formats: ["markdown"], onlyMainContent: true } } : {}),
            }),
            signal: AbortSignal.timeout(9000),
          }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
        : Promise.resolve(null);

    const firecrawlPromise = needsWebResearch ? fcSearch(`${sym} stock why it moved today news`, "qdr:w", true) : Promise.resolve(null);
    const firecrawlCasePromise = needsWebResearch ? fcSearch(`${sym} stock bull case bear case analyst outlook`, "qdr:m") : Promise.resolve(null);




    const quoteJson: any = await quotePromise;
    const q = quoteJson?.quoteResponse?.result?.[0] ?? {};
    const companyName: string = q.longName || q.shortName || sym;

    const newsJson: any = await newsPromise;



    // Filter headlines to ones that actually mention the ticker or a
    // distinctive word from the company name — drops unrelated noise.
    const nameWords = companyName
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 4 && !/^(inc|corp|corporation|company|the|and|group|holdings|ltd|plc|index|fund|etf|trust)$/i.test(w));
    const needles = [sym.toLowerCase(), ...nameWords.map((w) => w.toLowerCase())];
    // Social platforms and forums aren't journalism — never cite them, whether
    // they surface via Yahoo's news search or Firecrawl's open web search.
    const LOW_QUALITY_HOSTS = /(^|\.)(facebook|twitter|x|instagram|reddit|pinterest|linkedin|quora|tiktok|youtube)\.com$/i;
    const isLowQualityUrl = (url: string): boolean => {
      try { return LOW_QUALITY_HOSTS.test(new URL(url).hostname.replace(/^www\./, "")); }
      catch { return false; }
    };
    // Keep the raw filtered news items so we can build a sources array to send
    // to the client for citation UI, alongside the plain-text list for the prompt.
    const filteredNews = (newsJson?.news ?? []).filter((n: any) => {
      const t = `${n.title ?? ""} ${n.summary ?? ""}`.toLowerCase();
      if (!needles.some((n) => t.includes(n))) return false;
      const url = (n.link as string) ?? (n.url as string) ?? "";
      return !isLowQualityUrl(url);
    });
    // providerPublishTime is unix seconds. Headlines feed "whyMoved" — an old
    // story (a Fed decision from months back, a stale earnings recap) with no
    // date attached reads to the model as if it just happened, which is how a
    // long-gone macro event ends up explained as today's catalyst. Dropping
    // anything older than 14 days and stamping an explicit age on what's left
    // closes that off without the model having to guess.
    const nowSec = Date.now() / 1000;
    const ageDays = (n: any) => (nowSec - Number(n.providerPublishTime ?? nowSec)) / 86400;
    const recentNews = filteredNews.filter((n: any) => !n.providerPublishTime || ageDays(n) <= 14);
    const formatAge = (d: number) => (d < 1 ? "today" : d < 2 ? "yesterday" : `${Math.round(d)} days ago`);
    const headlines: string[] = recentNews
      .slice(0, 10)
      .map((n: any) => `- ${n.title} (${n.publisher}, ${n.providerPublishTime ? formatAge(ageDays(n)) : "date unknown"})`);
    const sources = recentNews.slice(0, 6).map((n: any) => ({
      title: n.title as string,
      publisher: n.publisher as string,
      url: (n.link as string) ?? (n.url as string) ?? "",
    }));

    // 3) Real web research (Firecrawl, started in parallel above): actual article
    //    text about why the stock moved, plus citable sources for the UI.
    let webContext = "";
    const webSources: { title: string; publisher: string; url: string }[] = [];
    if (needsWebResearch) {
      try {
        const [fc, fcCase]: any[] = await Promise.all([firecrawlPromise, firecrawlCasePromise]);
        const pick = (x: any): any[] => x?.data?.web ?? x?.web ?? (Array.isArray(x?.data) ? x.data : []) ?? [];
        const results: any[] = [...pick(fc).slice(0, 5), ...pick(fcCase).slice(0, 4)];
        const lines: string[] = [];
        const seen = new Set<string>();
        for (const r of results) {
          const title = (r.title ?? "").toString().trim();
          const url = (r.url ?? "").toString();
          if (!title || !url || seen.has(url) || isLowQualityUrl(url)) continue;
          seen.add(url);
          let host = "";
          try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
          const body = (r.markdown ?? r.description ?? r.snippet ?? "")
            .toString()
            .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
            .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 1400);
          const n = webSources.length + 1;
          webSources.push({ title, publisher: host || "web", url });
          lines.push(`[${n}] ${title} — ${host}\n${body}`);
        }
        if (lines.length) webContext = lines.join("\n\n");
      } catch (e) {
        console.warn("firecrawl error", e instanceof Error ? e.message : e);
      }
    }

    // Stories from the site's news feeds (CNBC, Fox Business, IBD, ...): the
    // headline and summary, or the full article when the feed carries it.
    // Numbered after any Firecrawl results, so citations line up with sources.
    if (needsWebResearch) {
      try {
        const j = await fetch(
          `${SUPABASE_URL}/functions/v1/yahoo-proxy?kind=news&limit=6&q=${encodeURIComponent(sym)}&name=${encodeURIComponent(companyName)}`,
          { headers: { apikey: anon }, signal: AbortSignal.timeout(10000) },
        ).then((r) => (r.ok ? r.json() : null));
        const lines: string[] = [];
        for (const st of (j?.stories ?? []) as { title: string; publisher: string; url: string; published: number; summary: string; text: string }[]) {
          if (webSources.length >= 8 || webSources.some((w) => w.url === st.url)) continue;
          const n = webSources.length + 1;
          webSources.push({ title: st.title, publisher: st.publisher, url: st.url });
          const age = st.published ? formatAge(ageDays({ providerPublishTime: st.published })) : "date unknown";
          lines.push(`[${n}] ${st.title} — ${st.publisher} (${age})\n${(st.text || st.summary || "(headline only)").slice(0, 1500)}`);
        }
        if (lines.length) webContext = [webContext, ...lines].filter(Boolean).join("\n\n");
      } catch (e) {
        console.warn("feed news error", e instanceof Error ? e.message : e);
      }
    }

    const webBlock = webContext
      ? `\n\nRESEARCH — real, recently published articles about ${companyName} (${sym}), fetched from the live web. These are the SOURCE OF TRUTH for "whyMoved", "positives" and "negatives":\n${webContext}\n\nWhen you use a fact from an article above, append its bracket number (e.g. [1], [2]) to that sentence or bullet. Never cite a number that is not listed above. Do not invent facts that are not in these articles.\n`
      : "";



    const beginnerPrompt = `Stock: ${companyName} (${sym})
Sector: ${q.sector ?? ""}  Industry: ${q.industry ?? ""}
Price: ${q.regularMarketPrice} ${q.currency ?? ""}
Mkt cap: ${q.marketCap}

Recent headlines about ${companyName} (${sym}):
${headlines.join("\n") || "(no recent headlines)"}

ONLY discuss ${companyName} (${sym}). Do NOT name ANY other company, ticker, or specific holding — not even as an example, not even if this is an index, ETF, or fund. Describe holdings only in generic categories (e.g. "large US tech companies", "energy producers"). If a headline above is not about ${companyName}, ignore it.

Explain ${companyName} to a complete beginner who has never invested before.
Return strict JSON: {"whatItDoes": string, "whyPeopleBuy": string, "whatToWatch": string}
- whatItDoes: 1-2 plain-English sentences about ${companyName} specifically. Avoid jargon. No other company names.
- whyPeopleBuy: 1-2 sentences on the bull case for ${companyName}. No other company names.
- whatToWatch: 1-2 sentences on risks specific to ${companyName}. No other company names.
No disclaimers, no markdown, no jargon.`;

    // Only the figures we actually have. Listing missing ones as "?" invited the
    // model to fill them in from memory, which is where made-up margins and
    // analyst targets came from.
    const num = (v: unknown, digits = 2) => (typeof v === "number" && Number.isFinite(v) ? v.toFixed(digits) : null);
    const big = (v: unknown) =>
      typeof v === "number" && v > 0 ? (v >= 1e12 ? `$${(v / 1e12).toFixed(2)}T` : v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : `$${(v / 1e6).toFixed(0)}M`) : null;
    const earningsTs = q.earningsTimestampStart ?? q.earningsTimestamp;
    const quoteLines = [
      `Today: ${today}`,
      `Stock: ${companyName} (${sym})`,
      num(q.regularMarketPrice) && `Price: ${num(q.regularMarketPrice)} ${q.currency ?? ""}`.trim(),
      num(q.regularMarketChangePercent) && `Change today: ${num(q.regularMarketChangePercent)}%`,
      num(q.regularMarketDayLow) && num(q.regularMarketDayHigh) && `Day range: ${num(q.regularMarketDayLow)}-${num(q.regularMarketDayHigh)}`,
      num(q.fiftyTwoWeekLow) && num(q.fiftyTwoWeekHigh) && `52-week range: ${num(q.fiftyTwoWeekLow)}-${num(q.fiftyTwoWeekHigh)}`,
      big(q.marketCap) && `Market cap: ${big(q.marketCap)}`,
      num(q.trailingPE, 1) && `Trailing P/E: ${num(q.trailingPE, 1)}`,
      num(q.forwardPE, 1) && `Forward P/E: ${num(q.forwardPE, 1)}`,
      num(q.epsTrailingTwelveMonths) && `EPS (trailing 12 months): ${num(q.epsTrailingTwelveMonths)}`,
      num(q.dividendYield) && `Dividend yield: ${num(q.dividendYield)}%`,
      // Yahoo keeps the last report's date until the next one is scheduled.
      typeof earningsTs === "number" && earningsTs > 0 &&
        `${earningsTs * 1000 > Date.now() ? "Next" : "Last"} earnings report: ${new Date(earningsTs * 1000).toISOString().slice(0, 10)}`,
    ].filter(Boolean);
    const fundamentalLines = await fundamentalsPromise;
    const quoteBlock = `${quoteLines.join("\n")}
${fundamentalLines.length ? `\nRESULTS FROM ${companyName.toUpperCase()}'S SEC FILINGS:\n${fundamentalLines.map((l) => `- ${l}`).join("\n")}\n` : ""}
These are the ONLY figures available about ${companyName}. Never state, estimate or imply any other figure about it (for example analyst price targets or ratings, beta, institutional ownership, or margins and debt that aren't listed). If a point would need one, make the point without the number or leave it out.`;

    const headlinesBlock = `Recent headlines about ${companyName} (${sym}):
${headlines.join("\n") || "(no recent headlines)"}`;

    const scopeGuard = `CRITICAL: This analysis is about ${companyName} (${sym}) only. Mention another company only where a story above ties it directly to ${companyName} (a deal, customer, partner or rival in that story), and never analyze another company's own stock. Ignore any headline above that is not about ${companyName}.`;

    const priorityHardRules = `HARD RULES for whyMoved (violating these is a failure):
- NEVER say "broad market action", "no recent headlines", "no news", "market sentiment", "general market conditions", or any similar filler.
- If a RESEARCH article above is provided, whyMoved MUST be built from it and MUST include at least one bracket citation like [1]. Name the actual catalyst and the reported number (earnings, guidance, analyst action, product/legal/macro event) as reported.
- Never state a catalyst that is not supported by the research or headlines above. If the research is thin, say what IS known and then explain the rest from the structural data.
- Every headline above is dated. NEVER treat a headline marked more than a few days old as the reason for TODAY's move, and NEVER cite a macroeconomic event (a Fed rate decision, a jobs or CPI report, an election, etc.) from memory — only if that exact event appears in the RESEARCH or a headline above dated within the last few days. If nothing recent is given, fall back to the structural data rule below instead of guessing a stale macro cause.
- If they do NOT give a concrete catalyst, explain the move from the figures above, citing the numbers: where the price sits in its 52-week range, profitability and growth from the SEC filing results, debt, or an unusually wide day range. Never present a guess as the cause.
- 3-5 sentences. Concrete numbers, not adjectives.
HARD RULES for positives and negatives (violating these is a failure):
- Every bullet MUST be grounded in EITHER (a) a RESEARCH article / headline above, or (b) the figures listed above (price data, valuation, and the SEC filing results: revenue growth, margins, profit, cash, debt). NEVER invent a claim or a number from general knowledge or memory.
- When a bullet draws on a RESEARCH article, it MUST end with that article's bracket citation (e.g. [1], [2]), using the SAME numbering as whyMoved. Never cite a number that is not listed above.
- When there is not enough research to support a specific bullish or bearish claim, do NOT guess: fall back explicitly to the structural financial data above and cite the actual figure (e.g. "Forward P/E of 18.4 vs trailing 24.1 implies expected earnings growth", "Debt/Equity of 162 leaves little cushion").
- No generic filler ("strong brand", "faces competition", "macro uncertainty") unless it is tied to a cited article or a specific number above.
- Every bullet has TWO parts in one flowing sentence, not just the fact: (1) the concrete fact/number, and (2) what it actually implies for the investment case — e.g. not "Forward P/E is 18.4" but "Forward P/E of 18.4 vs a trailing 24.1 implies the market already expects mid-teens earnings growth, so the multiple offers little cushion if growth disappoints." A bullet that only restates a fact without stating its consequence is a failure.
- Order bullets by materiality, most decision-relevant first — the single biggest driver of the bull or bear case leads each list, not the easiest fact to find.
- Do not restate the same underlying fact in both positives and negatives, and do not pad with a near-duplicate of another bullet in the same list — each bullet must add a distinct piece of the picture (a different metric, catalyst, or article).
- Where the research or data gives you a genuine counterpoint (e.g. strong revenue growth but deteriorating margins, or a bullish headline but stretched valuation), prefer that nuanced framing over a one-sided claim — real theses usually have tension, not just a clean list of good or bad things.
- 4-6 bullets each, 1-2 sentences, concrete numbers over adjectives.
HARD RULES for stanceScore and stanceReason (where this stock sits between its bear case and its bull case):
- stanceScore is an integer from -100 (the bear case clearly dominates) to 100 (the bull case clearly dominates); 0 means the two cases are evenly matched.
- Score it from YOUR positives and negatives, weighed by materiality, for someone holding the stock for the next 12 months: growth vs valuation, profitability, balance sheet, and the 52-week trend. Today's move alone must NOT decide it.
- Most stocks belong between -50 and 50. Go beyond 60 either way only when one side clearly outweighs the other on several of those factors.
- stanceReason: ONE plain-English sentence for a beginner that names the single strongest bull point and the single strongest bear point and says which one outweighs the other. No citations, no jargon.`;

    // "priority" — the fields the UI renders first: whyMoved, positives, negatives,
    // whatItDoes, outlook. Kept together because they're cheap to generate and
    // WhyItMoved / StockExplainer only need this subset.
    const priorityPrompt = `${quoteBlock}

${headlinesBlock}
${webBlock}
${scopeGuard}

Produce a DETAILED, in-depth analyst-grade summary. Be specific and quantitative — cite the actual numbers above (% change, P/E, EPS, revenue growth, margins, cash and debt). Plain English, no disclaimers.

${priorityHardRules}

Return strict JSON with shape:
{
  "whyMoved": string,              // 3-5 sentences, follow the HARD RULES above.
  "whatItDoes": string,            // 1-2 sentences on the company's business — what they actually sell/do and where their revenue comes from. Required.
  "positives": [string],           // 4-6 detailed bullets, grounded + cited per the HARD RULES above
  "negatives": [string],           // 4-6 detailed bullets, grounded + cited per the HARD RULES above
  "outlook": string,               // 2 sentence neutral synthesis
  "stanceScore": number,           // integer -100..100, per the HARD RULES above
  "stanceReason": string           // one sentence, per the HARD RULES above
}`;

    // "extended" — the deep-dive fields rendered further down in collapsed rows.
    // No citations required here, so this mode skips Firecrawl entirely (see
    // needsWebResearch above) — it only needs the structural quote data.
    const extendedPrompt = `${quoteBlock}

${headlinesBlock}
${scopeGuard}

Produce a DETAILED, in-depth analyst-grade summary. Be specific and quantitative — cite the actual numbers above (% change, P/E, EPS, revenue growth, margins, cash and debt). Plain English, no disclaimers.

Return strict JSON with shape:
{
  "predictedRevenue": string,      // a CONCRETE estimated next-fiscal-year TOTAL revenue figure as a dollar amount (e.g. "~$412B" or "~$8.5B"), then one short clause on how you got it. Base it on the SEC filing results above (latest fiscal year revenue and the latest quarter's growth). If no revenue figure is listed above, say "Not enough reported data to estimate" instead of guessing.
  "revenueGrowth": string,         // 2-3 sentences on historical + expected revenue growth trajectory, cite YoY % if known
  "earningsGrowth": string,        // 2-3 sentences on EPS trend, beat/miss history, forward growth expectations
  "margins": string,               // 2-3 sentences on gross/operating/net margin quality vs peers
  "balanceSheet": string,          // 2-3 sentences on debt, cash and leverage using the balance sheet figures above. If none are listed, say the filings data isn't available rather than guessing.
  "moat": string,                  // 2-3 sentences on competitive edge: brand, scale, network effects, switching costs, IP
  "earnings": string,              // 2-3 sentences on most recent + upcoming earnings event
  "forecast": string               // 3-4 sentences: 12-month business outlook and the key catalysts to watch, from the figures and headlines above. Never claim an analyst consensus or price target; none is given.
}`;

    // Legacy "full" — all 13 fields in one call, unchanged. Kept for any caller
    // that still wants a single combined response instead of priority + extended.
    const analystPrompt = `${quoteBlock}

${headlinesBlock}
${webBlock}
${scopeGuard}

Produce a DETAILED, in-depth analyst-grade summary. Be specific and quantitative — cite the actual numbers above (% change, P/E, EPS, revenue growth, margins, cash and debt). Plain English, no disclaimers.

${priorityHardRules}


Return strict JSON with shape:
{
  "whyMoved": string,              // 3-5 sentences, follow the HARD RULES above.
  "whatItDoes": string,            // 1-2 sentences on the company's business — what they actually sell/do and where their revenue comes from. Required.
  "positives": [string],           // 4-6 detailed bullets, grounded + cited per the HARD RULES above
  "negatives": [string],           // 4-6 detailed bullets, grounded + cited per the HARD RULES above

  "predictedRevenue": string,      // a CONCRETE estimated next-fiscal-year TOTAL revenue figure as a dollar amount (e.g. "~$412B" or "~$8.5B"), then one short clause on how you got it. Base it on the SEC filing results above (latest fiscal year revenue and the latest quarter's growth). If no revenue figure is listed above, say "Not enough reported data to estimate" instead of guessing.
  "revenueGrowth": string,         // 2-3 sentences on historical + expected revenue growth trajectory, cite YoY % if known
  "earningsGrowth": string,        // 2-3 sentences on EPS trend, beat/miss history, forward growth expectations
  "margins": string,               // 2-3 sentences on gross/operating/net margin quality vs peers
  "balanceSheet": string,          // 2-3 sentences on debt, cash and leverage using the balance sheet figures above. If none are listed, say the filings data isn't available rather than guessing.
  "moat": string,                  // 2-3 sentences on competitive edge: brand, scale, network effects, switching costs, IP
  "earnings": string,              // 2-3 sentences on most recent + upcoming earnings event
  "forecast": string,              // 3-4 sentences: 12-month business outlook and the key catalysts to watch, from the figures and headlines above. Never claim an analyst consensus or price target; none is given.
  "outlook": string,               // 2 sentence neutral synthesis
  "stanceScore": number,           // integer -100..100, per the HARD RULES above
  "stanceReason": string           // one sentence, per the HARD RULES above
}`;

    const beginnerSchema = {
      type: "object",
      properties: {
        whatItDoes: { type: "string" },
        whyPeopleBuy: { type: "string" },
        whatToWatch: { type: "string" },
      },
      required: ["whatItDoes", "whyPeopleBuy", "whatToWatch"],
    };
    const prioritySchema = {
      type: "object",
      properties: {
        whyMoved: { type: "string" },
        whatItDoes: { type: "string" },
        positives: { type: "array", items: { type: "string" } },
        negatives: { type: "array", items: { type: "string" } },
        outlook: { type: "string" },
        stanceScore: { type: "integer", minimum: -100, maximum: 100 },
        stanceReason: { type: "string" },
      },
      required: ["whyMoved", "whatItDoes", "positives", "negatives", "outlook", "stanceScore", "stanceReason"],
    };
    const extendedSchema = {
      type: "object",
      properties: {
        predictedRevenue: { type: "string" },
        revenueGrowth: { type: "string" },
        earningsGrowth: { type: "string" },
        margins: { type: "string" },
        balanceSheet: { type: "string" },
        moat: { type: "string" },
        earnings: { type: "string" },
        forecast: { type: "string" },
      },
      required: ["predictedRevenue", "revenueGrowth", "earningsGrowth", "margins", "balanceSheet", "moat", "earnings", "forecast"],
    };
    const analystSchema = {
      type: "object",
      properties: {
        whyMoved: { type: "string" },
        whatItDoes: { type: "string" },
        positives: { type: "array", items: { type: "string" } },
        negatives: { type: "array", items: { type: "string" } },
        predictedRevenue: { type: "string" },
        revenueGrowth: { type: "string" },
        earningsGrowth: { type: "string" },
        margins: { type: "string" },
        balanceSheet: { type: "string" },
        moat: { type: "string" },
        earnings: { type: "string" },
        forecast: { type: "string" },
        outlook: { type: "string" },
        stanceScore: { type: "integer", minimum: -100, maximum: 100 },
        stanceReason: { type: "string" },
      },
      required: ["whyMoved", "whatItDoes", "positives", "negatives", "predictedRevenue", "revenueGrowth", "earningsGrowth", "margins", "balanceSheet", "moat", "earnings", "forecast", "outlook", "stanceScore", "stanceReason"],
    };



    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const schema = isBeginner ? beginnerSchema : isPriority ? prioritySchema : isExtended ? extendedSchema : analystSchema;
    const prompt = isBeginner ? beginnerPrompt : isPriority ? priorityPrompt : isExtended ? extendedPrompt : analystPrompt;
    // Smaller ceilings for the split modes since each now generates far fewer
    // fields than the legacy 13-field response — a prior full-response run showed
    // 2200 truncates 13 fields' worth of output, so keep real headroom per call
    // rather than tune this tightly; the ceiling doesn't cost latency, only the
    // tokens actually generated do, and each split call generates much less.
    const maxTokens = isBeginner ? 1000 : isPriority ? 2800 : isExtended ? 2400 : 3800;
    const messages = [
      { role: "system", content: (isBeginner
          ? "You explain stocks to first-time investors in friendly plain English."
          : "You are a concise equity research analyst writing for beginners.")
          + ` Reply with ONLY a single valid JSON object matching this JSON Schema (no markdown, no commentary): ${JSON.stringify(schema)}` },
      { role: "user", content: prompt },
    ];

    // JSON mode instead of forced tool calls: Groq models frequently emit a bogus
    // tool name ("json") when tool_choice is forced, which Groq rejects with a 400.
    const callProvider = (url: string, apiKey: string, model: string) =>
      fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        // max_tokens is a safety ceiling only, set high enough that a normal response for this
        // schema never gets near it: in strict JSON mode, truncation produces invalid JSON, which
        // silently degrades the ENTIRE response to "Analysis unavailable" fallback text for every
        // field — confirmed live for GOOGL at 2200. Bound worst-case runaway generation without
        // risking that.
        body: JSON.stringify({
          model,
          messages,
          response_format: { type: "json_object" },
          max_tokens: maxTokens,
          // Reasoning tokens count toward max_tokens; short reasoning keeps the
          // JSON from being cut off (which would make the whole response unusable).
          ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {}),
        }),
      });

    // Primary: Groq's larger gpt-oss-120b (noticeably better analysis than the
    // 20b), then the 20b (separate rate-limit bucket), then Lovable AI gateway
    // as the last resort.
    // Groq's free tier caps tokens-per-minute (prompt + max_tokens count), so
    // on a short 429 we wait the suggested time and retry once, and on a flaky
    // JSON-validation 400 we retry once, before falling through.
    const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const callGroq = async (model: string, key: string = GROQ_API_KEY) => {
      let r = await callProvider(GROQ_URL, key, model);
      if (r.status === 429 || r.status === 400) {
        const body = await r.clone().text();
        let waitMs = 0;
        if (r.status === 429) {
          const m = body.match(/try again in ([\d.]+)s/i);
          const secs = m ? parseFloat(m[1]) : Number(r.headers.get("retry-after") ?? "0");
          if (secs > 0 && secs <= 12) waitMs = Math.ceil(secs * 1000) + 250;
        } else if (/json_validate_failed/.test(body)) {
          waitMs = 1;
        }
        if (waitMs) {
          console.warn("groq retry", model, r.status, body.slice(0, 200));
          await sleep(waitMs);
          r = await callProvider(GROQ_URL, key, model);
        }
      }
      return r;
    };

    // 404/400 = model decommissioned or request rejected by Groq → also fall through.
    const groqUnavailable = (r: Response) =>
      r.status === 429 || r.status === 402 || r.status === 404 || r.status === 400 || r.status >= 500;

    let aiRes = await callGroq("openai/gpt-oss-120b");
    if (groqUnavailable(aiRes)) {
      console.warn("groq primary unavailable", aiRes.status, (await aiRes.clone().text()).slice(0, 500));
      aiRes = await callGroq("openai/gpt-oss-20b");
    }
    // Backup Groq key: used only when the main key is exhausted/unavailable.
    const GROQ_KEY_2 = Deno.env.get("Groq_API_Key_2");
    if (groqUnavailable(aiRes) && GROQ_KEY_2) {
      console.warn("groq key 1 unavailable", aiRes.status, "— trying Groq key 2");
      aiRes = await callGroq("openai/gpt-oss-120b", GROQ_KEY_2);
      if (groqUnavailable(aiRes)) aiRes = await callGroq("openai/gpt-oss-20b", GROQ_KEY_2);
    }

    if (groqUnavailable(aiRes) && LOVABLE_API_KEY) {
      console.warn("groq unavailable", aiRes.status, (await aiRes.clone().text()).slice(0, 300), "— falling back to Lovable AI");
      const lov = await callProvider("https://ai.gateway.lovable.dev/v1/chat/completions", LOVABLE_API_KEY, "google/gemini-3.6-flash");
      // Out of Lovable credits → report as a temporary rate limit instead of a hard credits error.
      if (lov.status === 402 || lov.status === 403) {
        console.error("lovable fallback unavailable", lov.status);
        return new Response(JSON.stringify({ error: "Rate limit, try again shortly.", unavailable: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      aiRes = lov;
    }



    if (aiRes.status === 429) {
      const t = await aiRes.text();
      console.error("ai 429", t);
      return new Response(JSON.stringify({ error: "Rate limit, try again shortly.", unavailable: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "Rate limit, try again shortly.", unavailable: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("ai err", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const msg = data?.choices?.[0]?.message ?? {};
    const raw: string = msg?.tool_calls?.[0]?.function?.arguments ?? msg?.content ?? "{}";
    let parsed: any = {};
    // A result that's mostly placeholder text is served, but not cached for hours.
    let degraded = false;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      try { parsed = m ? JSON.parse(m[0]) : {}; } catch { parsed = {}; degraded = true; }
    }

    if (!isBeginner) {
      const fallback = `No specific data available for ${companyName}. This may apply more to individual operating companies than to indices, ETFs, or funds.`;
      const stringFields = isPriority
        ? ["whyMoved", "whatItDoes", "outlook"]
        : isExtended
        ? ["predictedRevenue", "revenueGrowth", "earningsGrowth", "margins", "balanceSheet", "moat", "earnings", "forecast"]
        : ["whyMoved", "whatItDoes", "predictedRevenue", "revenueGrowth", "earningsGrowth", "margins", "balanceSheet", "moat", "earnings", "forecast", "outlook"];
      let fellBack = 0;
      for (const f of stringFields) {
        if (!parsed[f] || typeof parsed[f] !== "string" || !parsed[f].trim()) {
          parsed[f] = fallback;
          fellBack++;
        }
      }
      if (fellBack > stringFields.length / 2) degraded = true;
      if (!isExtended) {
        if (!Array.isArray(parsed.positives) || !parsed.positives.length) {
          parsed.positives = ["Analysis unavailable right now."];
          degraded = true;
        }
        if (!Array.isArray(parsed.negatives) || !parsed.negatives.length) {
          parsed.negatives = ["Analysis unavailable right now."];
          degraded = true;
        }
        // The bull-vs-bear spectrum is optional: a missing or malformed score is
        // dropped (the page then just doesn't draw the spectrum), never guessed.
        const score = typeof parsed.stanceScore === "number" ? parsed.stanceScore : parseFloat(parsed.stanceScore);
        if (Number.isFinite(score)) parsed.stanceScore = Math.max(-100, Math.min(100, Math.round(score)));
        else delete parsed.stanceScore;
        if (typeof parsed.stanceReason !== "string" || !parsed.stanceReason.trim() || parsed.stanceScore === undefined) {
          delete parsed.stanceReason;
        }
      }
    }
    // Attach real headline sources so the UI can render citations. Only the modes
    // that actually ground claims in Firecrawl/headline research need this —
    // "extended" has no citations, so skip it there rather than send a sources
    // array that doesn't correspond to anything in the extended text.
    if (!isExtended) {
      const seen = new Set<string>();
      parsed.sources = [...webSources, ...sources].filter((s: any) => {
        if (!s?.url || seen.has(s.url)) return false;
        seen.add(s.url);
        return true;
      }).slice(0, 10);
      parsed.grounded = webSources.length > 0;
    }

    const body = JSON.stringify(parsed);
    if (degraded) {
      // Short memory-only hold so a burst of requests doesn't re-run a failing generation.
      cache.set(key, { body, exp: Date.now() + 5 * 60 * 1000 });
    } else {
      const exp = expiryFor(modeKey);
      cache.set(key, { body, exp });
      await writeStored(sym, modeKey, parsed, exp);
    }
    return new Response(body, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Could not generate summary. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
