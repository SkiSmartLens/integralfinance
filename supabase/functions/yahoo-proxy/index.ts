const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const cache = new Map<string, { exp: number; body: string }>();
function getCache(k: string) {
  const v = cache.get(k);
  if (v && v.exp > Date.now()) return v.body;
  cache.delete(k);
  return null;
}
function setCache(k: string, body: string, ttl: number) {
  cache.set(k, { body, exp: Date.now() + ttl });
}

async function yahooFetch(url: string) {
  return fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json,text/plain,*/*" },
  });
}

interface MetaExtra {
  marketCap?: number;
  sharesOutstanding?: number;
  trailingPE?: number;
  forwardPE?: number;
  epsTrailingTwelveMonths?: number;
  earningsTimestamp?: number;
  earningsTimestampStart?: number;
  earningsTimestampEnd?: number;
  dividendYield?: number;
  bid?: number;
  ask?: number;
  bidSize?: number;
  askSize?: number;
  regularMarketTime?: number;
}


const metaCache = new Map<string, { exp: number; data: MetaExtra }>();

// Cached Yahoo crumb + cookie for authenticated JSON endpoints.
let crumbCache: { crumb: string; cookie: string; exp: number } | null = null;
async function getCrumb(): Promise<{ crumb: string; cookie: string } | null> {
  if (crumbCache && crumbCache.exp > Date.now()) return crumbCache;
  try {
    const r1 = await fetch("https://fc.yahoo.com", {
      headers: { "User-Agent": UA },
      redirect: "manual",
    });
    const setCookie = r1.headers.get("set-cookie") || "";
    // Take just the name=value pairs
    const cookie = setCookie
      .split(/,(?=[^ ]+=)/)
      .map((c) => c.split(";")[0].trim())
      .filter(Boolean)
      .join("; ");
    if (!cookie) return null;
    const r2 = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "User-Agent": UA, Cookie: cookie },
    });
    if (!r2.ok) return null;
    const crumb = (await r2.text()).trim();
    if (!crumb || crumb.length > 64 || crumb.includes("<")) return null;
    crumbCache = { crumb, cookie, exp: Date.now() + 30 * 60 * 1000 };
    return crumbCache;
  } catch {
    return null;
  }
}

// Parse "4.344T" / "12.3B" / "987M" style strings into a number.
function parseAbbrev(s: string): number | undefined {
  if (!s) return undefined;
  const m = s.replace(/,/g, "").trim().match(/^([0-9]*\.?[0-9]+)\s*([TBMK])?/i);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  const mult: Record<string, number> = { T: 1e12, B: 1e9, M: 1e6, K: 1e3 };
  return n * (mult[(m[2] || "").toUpperCase()] ?? 1);
}

async function fetchMeta(symbol: string, priceHint?: number): Promise<MetaExtra> {
  const cached = metaCache.get(symbol);
  if (cached && cached.exp > Date.now()) return cached.data;

  const enc = encodeURIComponent(symbol);
  const out: MetaExtra = {};

  const merge = (q: any) => {
    if (!q) return;
    if (out.marketCap == null && typeof q.marketCap === "number" && q.marketCap > 0) out.marketCap = q.marketCap;
    if (out.sharesOutstanding == null && typeof q.sharesOutstanding === "number" && q.sharesOutstanding > 0) out.sharesOutstanding = q.sharesOutstanding;
    if (out.trailingPE == null && typeof q.trailingPE === "number") out.trailingPE = q.trailingPE;
    if (out.forwardPE == null && typeof q.forwardPE === "number") out.forwardPE = q.forwardPE;
    if (out.epsTrailingTwelveMonths == null && typeof q.epsTrailingTwelveMonths === "number") out.epsTrailingTwelveMonths = q.epsTrailingTwelveMonths;
    if (out.earningsTimestamp == null && typeof q.earningsTimestamp === "number") out.earningsTimestamp = q.earningsTimestamp;
    if (out.earningsTimestampStart == null && typeof q.earningsTimestampStart === "number") out.earningsTimestampStart = q.earningsTimestampStart;
    if (out.earningsTimestampEnd == null && typeof q.earningsTimestampEnd === "number") out.earningsTimestampEnd = q.earningsTimestampEnd;
    if (out.dividendYield == null && typeof q.dividendYield === "number") out.dividendYield = q.dividendYield;
    if (out.bid == null && typeof q.bid === "number" && q.bid > 0) out.bid = q.bid;
    if (out.ask == null && typeof q.ask === "number" && q.ask > 0) out.ask = q.ask;
    if (out.bidSize == null && typeof q.bidSize === "number") out.bidSize = q.bidSize;
    if (out.askSize == null && typeof q.askSize === "number") out.askSize = q.askSize;
    if (out.regularMarketTime == null && typeof q.regularMarketTime === "number") out.regularMarketTime = q.regularMarketTime;
  };

  // Authenticated v7/finance/quote — gives marketCap, PE, earnings in one shot.
  const auth = await getCrumb();
  if (auth) {
    for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
      try {
        const r = await fetch(
          `https://${host}/v7/finance/quote?symbols=${enc}&crumb=${encodeURIComponent(auth.crumb)}`,
          { headers: { "User-Agent": UA, Cookie: auth.cookie } },
        );
        if (r.status === 401 || r.status === 403) { crumbCache = null; break; }
        if (!r.ok) continue;
        const j = await r.json();
        merge(j?.quoteResponse?.result?.[0]);
        if (out.marketCap && out.earningsTimestamp) break;
      } catch { /* ignore */ }
    }
  }

  // Last resort: shares × price.
  if (!out.marketCap && out.sharesOutstanding && typeof priceHint === "number") {
    out.marketCap = out.sharesOutstanding * priceHint;
  }
  if (out.trailingPE == null && out.epsTrailingTwelveMonths && out.epsTrailingTwelveMonths > 0 && typeof priceHint === "number") {
    out.trailingPE = priceHint / out.epsTrailingTwelveMonths;
  }

  if (out.marketCap || out.trailingPE || out.earningsTimestamp) {
    metaCache.set(symbol, { exp: Date.now() + 5 * 60 * 1000, data: out });
  } else {
    // Cache the miss briefly so we don't hammer the upstream while it's blocked.
    metaCache.set(symbol, { exp: Date.now() + 30 * 1000, data: out });
  }
  return out;
}

async function chartMetaQuote(symbol: string): Promise<any | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?range=1d&interval=1m&includePrePost=false`;
  try {
    const r = await yahooFetch(url);
    let m: any = null;
    let result: any = null;
    let price: number | undefined;
    let prev: number | undefined;
    if (r.ok) {
      const j = await r.json();
      result = j?.chart?.result?.[0];
      m = result?.meta;
      price = m?.regularMarketPrice;
      prev = m?.chartPreviousClose ?? m?.previousClose;
    }
    const extra = await fetchMeta(symbol, price);
    if (!m) return { symbol, error: r.ok ? "no meta" : `HTTP ${r.status}`, ...extra };
    const change = price != null && prev != null ? price - prev : undefined;
    const changePct =
      change != null && prev ? (change / prev) * 100 : undefined;
    return {
      symbol: m.symbol ?? symbol,
      shortName: m.shortName,
      longName: m.longName,
      exchange: m.exchangeName ?? m.fullExchangeName,
      currency: m.currency,
      regularMarketPrice: price,
      regularMarketPreviousClose: prev,
      regularMarketChange: change,
      regularMarketChangePercent: changePct,
      regularMarketOpen:
        result?.indicators?.quote?.[0]?.open?.find((v: number) => v != null) ??
        undefined,
      regularMarketDayHigh: m.regularMarketDayHigh,
      regularMarketDayLow: m.regularMarketDayLow,
      regularMarketVolume: m.regularMarketVolume,
      fiftyTwoWeekHigh: m.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: m.fiftyTwoWeekLow,
      ...extra,
    };
  } catch (e) {
    return { symbol, error: e instanceof Error ? e.message : "err" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const kind = url.searchParams.get("kind") ?? "quote";

    if (kind === "quote") {
      const symbols = (url.searchParams.get("symbols") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!symbols.length) return json({ error: "symbols required" }, 400);
      const cacheKey = "q:" + symbols.join(",");
      const cached = getCache(cacheKey);
      if (cached) return new Response(cached, jsonHeaders());

      const results = await Promise.all(symbols.map((s) => chartMetaQuote(s)));
      const body = JSON.stringify({ quoteResponse: { result: results.filter(Boolean) } });
      setCache(cacheKey, body, 1500);
      return new Response(body, jsonHeaders());
    }

    if (kind === "chart") {
      const symbol = url.searchParams.get("symbol");
      if (!symbol) return json({ error: "symbol required" }, 400);
      const range = url.searchParams.get("range") ?? "1d";
      const interval = url.searchParams.get("interval") ?? "5m";
      const includePrePost = url.searchParams.get("includePrePost") === "true";
      const cacheKey = `c:${symbol}:${range}:${interval}:${includePrePost ? "pp" : "n"}`;
      const cached = getCache(cacheKey);
      if (cached) return new Response(cached, jsonHeaders());
      const upstream = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        symbol
      )}?range=${range}&interval=${interval}&includePrePost=${includePrePost ? "true" : "false"}`;
      const r = await yahooFetch(upstream);
      const body = await r.text();
      if (r.ok) setCache(cacheKey, body, 2000);
      return new Response(body, { ...jsonHeaders(), status: r.ok ? 200 : r.status });
    }

    // News feeds the browser can't read itself (they don't allow other sites).
    // Only this fixed list, so it can't be used to fetch arbitrary URLs. Keep
    // in sync with PROXIED_FEEDS in src/lib/news.ts.
    if (kind === "rss") {
      const target = RSS_FEEDS[url.searchParams.get("feed") ?? ""];
      if (!target) return json({ error: "unknown feed" }, 400);
      const body = await feedXml(target.url);
      if (!body) return json({ error: "feed unavailable" }, 502);
      return new Response(body, xmlHeaders());
    }

    // For the AI features (stock-summary, ai-chat): recent stories about a
    // company from every news feed, with article text where the feed has it.
    if (kind === "news") {
      const q = url.searchParams.get("q") ?? "";
      const name = url.searchParams.get("name") ?? "";
      if (!q && !name) return json({ error: "q or name required" }, 400);
      const limit = Math.min(12, Math.max(1, Number(url.searchParams.get("limit") ?? "8") || 8));
      return json({ stories: await newsAbout(q, name, limit) });
    }

    // For the AI features: revenue, profit, margins, debt and cash from the
    // company's own SEC filings. Empty lines for funds, crypto and non-US stocks.
    if (kind === "fundamentals") {
      const symbol = (url.searchParams.get("symbol") ?? "").toUpperCase();
      if (!/^[A-Z0-9.\-]{1,10}$/.test(symbol)) return json({ error: "symbol required" }, 400);
      return json(await fundamentals(symbol));
    }

    if (kind === "screener") {
      const scrId = url.searchParams.get("scrId") ?? "day_gainers";
      const count = url.searchParams.get("count") ?? "25";
      const cacheKey = `scr:${scrId}:${count}`;
      const cached = getCache(cacheKey);
      if (cached) return new Response(cached, jsonHeaders());
      const upstream = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=${encodeURIComponent(scrId)}&count=${encodeURIComponent(count)}`;
      const r = await yahooFetch(upstream);
      const body = await r.text();
      if (r.ok) setCache(cacheKey, body, 60000);
      return new Response(body, { ...jsonHeaders(), status: r.ok ? 200 : r.status });
    }

    if (kind === "search") {
      const q = url.searchParams.get("q") ?? "stock market";
      const newsCount = url.searchParams.get("newsCount") ?? "20";
      const quotesCount = url.searchParams.get("quotesCount") ?? "0";
      const cacheKey = `s:${q}:${newsCount}:${quotesCount}`;
      const cached = getCache(cacheKey);
      if (cached) return new Response(cached, jsonHeaders());
      const upstream = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
        q
      )}&newsCount=${newsCount}&quotesCount=${quotesCount}`;
      const r = await yahooFetch(upstream);
      const body = await r.text();
      if (r.ok) setCache(cacheKey, body, 30000);
      return new Response(body, { ...jsonHeaders(), status: r.ok ? 200 : r.status });
    }

    if (kind === "options") {
      const symbol = url.searchParams.get("symbol");
      if (!symbol) return json({ error: "symbol required" }, 400);
      const date = url.searchParams.get("date");
      const cacheKey = `opt:${symbol}:${date ?? "next"}`;
      const cached = getCache(cacheKey);
      if (cached) return new Response(cached, jsonHeaders());

      // Like v7/finance/quote, this endpoint now 401s ("Invalid Crumb") without
      // the authenticated crumb+cookie pair fetchMeta() already knows how to get.
      const fetchOptionsOnce = async (auth: { crumb: string; cookie: string }) => {
        const qs = new URLSearchParams({ crumb: auth.crumb });
        if (date) qs.set("date", date);
        const upstream = `https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}?${qs.toString()}`;
        return fetch(upstream, {
          headers: { "User-Agent": UA, Cookie: auth.cookie, Accept: "application/json,text/plain,*/*" },
        });
      };

      const auth = await getCrumb();
      if (!auth) return json({ error: "Could not authenticate with Yahoo Finance. Please try again shortly." }, 503);
      let r = await fetchOptionsOnce(auth);
      if (r.status === 401 || r.status === 403) {
        crumbCache = null;
        const retryAuth = await getCrumb();
        if (retryAuth) r = await fetchOptionsOnce(retryAuth);
      }
      const body = await r.text();
      if (r.ok) setCache(cacheKey, body, 30000);
      return new Response(body, { ...jsonHeaders(), status: r.ok ? 200 : r.status });
    }

    return json({ error: "invalid kind" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return json({ error: msg }, 500);
  }
});

interface Feed {
  publisher: string;
  url: string;
}

const RSS_FEEDS: Record<string, Feed> = {
  ibd: { publisher: "Investor's Business Daily", url: "https://www.investors.com/feed/" },
  guardian: { publisher: "The Guardian", url: "https://www.theguardian.com/us/business/rss" },
  bbc: { publisher: "BBC News", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  cbs: { publisher: "CBS News", url: "https://www.cbsnews.com/latest/rss/moneywatch" },
  abc: { publisher: "ABC News", url: "https://abcnews.com/abcnews/moneyheadlines" },
  npr_business: { publisher: "NPR", url: "https://feeds.npr.org/1006/rss.xml" },
  npr_economy: { publisher: "NPR", url: "https://feeds.npr.org/1017/rss.xml" },
  fortune: { publisher: "Fortune", url: "https://fortune.com/feed/fortune-feeds/?id=3230629" },
};

// Every feed the site shows (src/lib/news.ts reads the CNBC and Fox Business
// ones straight from the browser), for the news search the AI features use.
const NEWS_FEEDS: Feed[] = [
  ...[15839069, 20409666, 15839135, 20910258, 10000664, 19854910, 10001147].map((id) => ({
    publisher: "CNBC",
    url: `https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=${id}`,
  })),
  { publisher: "Fox Business", url: "https://moxie.foxbusiness.com/google-publisher/markets.xml" },
  { publisher: "Fox Business", url: "https://moxie.foxbusiness.com/google-publisher/economy.xml" },
  ...Object.values(RSS_FEEDS),
];

/** A feed's XML, cached a few minutes. Empty if it couldn't be fetched. */
async function feedXml(feedUrl: string): Promise<string> {
  const key = `feed:${feedUrl}`;
  const hit = getCache(key);
  if (hit) return hit;
  try {
    const r = await fetch(feedUrl, {
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8" },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return "";
    const body = await r.text();
    setCache(key, body, 3 * 60 * 1000);
    return body;
  } catch {
    return "";
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/gi, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<\/(p|h[1-6]|li|blockquote)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/** The raw value of an RSS tag: CDATA as-is, otherwise entity-decoded. */
function tagValue(item: string, tag: string): string {
  const m = item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  if (!m) return "";
  const v = m[1].trim();
  const cdata = v.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return cdata ? cdata[1] : decodeEntities(v);
}

/** WordPress feeds (IBD) end every summary with "The post X appeared first on Y." */
const stripFeedBoilerplate = (t: string) => t.replace(/\s*The post .{0,300}? appeared first on [^.\n]{0,80}\.?\s*$/s, "").trim();

interface Story {
  title: string;
  publisher: string;
  url: string;
  /** Unix seconds. */
  published: number;
  summary: string;
  /** The full article when the feed carries it, else "". */
  text: string;
}

function parseFeed(xml: string, publisher: string): Story[] {
  const out: Story[] = [];
  for (const item of xml.match(/<item[\s>][\s\S]*?<\/item>/g) ?? []) {
    const link = tagValue(item, "link").trim();
    const title = htmlToText(tagValue(item, "title"));
    if (!/^https:\/\//.test(link) || !title) continue;
    const published = Date.parse(tagValue(item, "pubDate"));
    const text = htmlToText(tagValue(item, "content:encoded"));
    out.push({
      title,
      publisher,
      url: link,
      published: Number.isFinite(published) ? Math.floor(published / 1000) : 0,
      summary: stripFeedBoilerplate(htmlToText(tagValue(item, "description"))).slice(0, 600),
      text: text.length >= 400 ? text.slice(0, 4000) : "",
    });
  }
  return out;
}

// Same matching as pickStories in src/lib/news.ts.
const COMPANY_SUFFIX =
  /(,?\s+(inc\.?|incorporated|corp\.?|corporation|co\.?|company|holdings?|group|ltd\.?|limited|plc|n\.v\.|s\.a\.|ag|se|platforms|technologies|class [a-c]|common stock))+$/i;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function shortCompanyName(name: string): string {
  let n = name.trim().replace(/\.com\b/i, "");
  for (let prev = ""; prev !== n; ) {
    prev = n;
    n = n.replace(COMPANY_SUFFIX, "").replace(/(\s+(&|and))?[,.\s]*$/i, "");
  }
  return n;
}

const GENERIC_FIRST_WORDS = new Set(
  "general american united international national first global digital new western southern northern eastern royal advanced applied texas union capital energy health bank the".split(" "),
);

/** The short name, plus its first word when distinctive ("Ford", "JPMorgan"). */
function companyNames(name: string): string[] {
  const short = shortCompanyName(name);
  const first = short.split(/\s+/)[0] ?? "";
  const names = [short];
  if (first !== short && first.length >= 4 && !GENERIC_FIRST_WORDS.has(first.toLowerCase())) names.push(first);
  return names.filter((n) => n.length >= 3);
}

function storyPatterns(ticker: string, name: string): RegExp[] {
  const pats: RegExp[] = [];
  const t = ticker.trim().toUpperCase();
  if (/^[A-Z][A-Z.-]{0,5}$/.test(t)) {
    // One- and two-letter tickers ("F", "AI") are ordinary words too, so they
    // only count in "(F)" or "NYSE: F" form.
    pats.push(
      t.length <= 2
        ? new RegExp(`\\(${escapeRe(t)}\\)|(NYSE|NASDAQ|ticker):\\s*${escapeRe(t)}\\b`)
        : new RegExp(`(^|[^A-Za-z])${escapeRe(t)}([^A-Za-z]|$)`),
    );
  }
  for (const n of companyNames(name)) pats.push(new RegExp(`\\b${escapeRe(n)}\\b`, "i"));
  return pats;
}

/** Stories from the last 10 days whose headline or summary names the company, newest first. */
async function newsAbout(ticker: string, name: string, limit: number): Promise<Story[]> {
  const pats = storyPatterns(ticker, name);
  if (!pats.length) return [];
  const feeds = await Promise.all(NEWS_FEEDS.map(async (f) => parseFeed(await feedXml(f.url), f.publisher)));
  const cutoff = Date.now() / 1000 - 10 * 86400;
  const seen = new Set<string>();
  return feeds
    .flat()
    .filter((s) => s.published >= cutoff && pats.some((p) => p.test(s.title) || p.test(s.summary)))
    .sort((a, b) => b.published - a.published)
    .filter((s) => {
      const keys = [s.url.replace(/[?#].*$/, ""), s.title.toLowerCase()];
      if (keys.some((k) => seen.has(k))) return false;
      keys.forEach((k) => seen.add(k));
      return true;
    })
    .slice(0, limit);
}

// ---- Company financials from SEC filings (data.sec.gov) ----
// The SEC asks automated clients to identify themselves with a contact address.
const SEC_UA = "IntegralStocks hello@integralstocks.com";
const DAY_MS = 86_400_000;
let secTickers: { exp: number; map: Map<string, { cik: number; title: string }> } | null = null;

async function secCompany(symbol: string): Promise<{ cik: number; title: string } | null> {
  if (!secTickers || secTickers.exp < Date.now()) {
    const r = await fetch("https://www.sec.gov/files/company_tickers.json", {
      headers: { "User-Agent": SEC_UA },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as Record<string, { cik_str: number; ticker: string; title: string }>;
    const map = new Map<string, { cik: number; title: string }>();
    for (const v of Object.values(j)) map.set(String(v.ticker).toUpperCase(), { cik: Number(v.cik_str), title: String(v.title) });
    secTickers = { exp: Date.now() + 24 * 60 * 60 * 1000, map };
  }
  return secTickers.map.get(symbol) ?? secTickers.map.get(symbol.replace(/\./g, "-")) ?? null;
}

interface Fact {
  start?: string;
  end: string;
  val: number;
  form: string;
  filed: string;
}

const spanDays = (f: Fact) => (f.start ? (Date.parse(f.end) - Date.parse(f.start)) / DAY_MS : 0);
const isQuarter = (f: Fact) => spanDays(f) >= 80 && spanDays(f) <= 100;
const isYear = (f: Fact) => spanDays(f) >= 350 && spanDays(f) <= 380;
const isInstant = (f: Fact) => !f.start;
const near = (a: string, b: string, days: number) => Math.abs(Date.parse(a) - Date.parse(b)) <= days * DAY_MS;

/**
 * One line item from 10-Q/10-K filings, using whichever of `tags` the company
 * reported most recently (they switch, e.g. Revenues vs.
 * RevenueFromContractWithCustomer...). One value per period; a later filing's
 * restatement wins. Oldest first.
 */
// deno-lint-ignore no-explicit-any
function lineItem(gaap: any, tags: string[], unit = "USD"): Fact[] {
  let best: Fact[] = [];
  let bestEnd = "";
  for (const tag of tags) {
    const vals = ((gaap?.[tag]?.units?.[unit] ?? []) as Fact[]).filter(
      (f) => /^10-[QK]/.test(f.form) && typeof f.val === "number" && !!f.end,
    );
    if (!vals.length) continue;
    const end = vals.reduce((m, f) => (f.end > m ? f.end : m), "");
    if (end > bestEnd) {
      bestEnd = end;
      best = vals;
    }
  }
  const byPeriod = new Map<string, Fact>();
  for (const f of best) {
    const k = `${f.start ?? ""}|${f.end}`;
    const prev = byPeriod.get(k);
    if (!prev || f.filed > prev.filed) byPeriod.set(k, f);
  }
  return [...byPeriod.values()].sort((a, b) => a.end.localeCompare(b.end));
}

const latestOf = (list: Fact[], pred: (f: Fact) => boolean) => [...list].reverse().find(pred);
const samePeriod = (list: Fact[], f?: Fact) =>
  f ? list.find((x) => (f.start ? !!x.start && near(x.start, f.start, 5) : !x.start) && near(x.end, f.end, 5)) : undefined;
const yearEarlier = (list: Fact[], f: Fact | undefined, pred: (f: Fact) => boolean) =>
  f ? list.find((x) => pred(x) && near(x.end, new Date(Date.parse(f.end) - 365 * DAY_MS).toISOString(), 20)) : undefined;

function money(n: number): string {
  const a = Math.abs(n);
  const s = a >= 1e12 ? `${(a / 1e12).toFixed(2)}T` : a >= 1e9 ? `${(a / 1e9).toFixed(1)}B` : a >= 1e6 ? `${(a / 1e6).toFixed(0)}M` : a.toFixed(0);
  return `${n < 0 ? "-" : ""}$${s}`;
}
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const change = (now: number, before?: number) =>
  before && before > 0 ? ` (${now >= before ? "up" : "down"} ${pct(Math.abs(now / before - 1))} from ${money(before)} a year earlier)` : "";

/** Plain-English lines about a company's latest results, for an AI prompt. */
// deno-lint-ignore no-explicit-any
function describeFinancials(gaap: any): string[] {
  const revenue = lineItem(gaap, ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "SalesRevenueNet", "RevenueFromContractWithCustomerIncludingAssessedTax"]);
  const gross = lineItem(gaap, ["GrossProfit"]);
  const operating = lineItem(gaap, ["OperatingIncomeLoss"]);
  const net = lineItem(gaap, ["NetIncomeLoss", "ProfitLoss"]);
  const eps = lineItem(gaap, ["EarningsPerShareDiluted", "EarningsPerShareBasic"], "USD/shares");
  const cash = lineItem(gaap, ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"]);
  const debt = lineItem(gaap, ["LongTermDebt", "LongTermDebtNoncurrent", "LongTermDebtAndCapitalLeaseObligations"]);
  const equity = lineItem(gaap, ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"]);
  const opCash = lineItem(gaap, ["NetCashProvidedByUsedInOperatingActivities"]);
  const capex = lineItem(gaap, ["PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets"]);
  const lines: string[] = [];

  // A company can stop using a line item for one kind of period (a bank's
  // quarterly revenue ending in 2014), so the latest period has to be recent.
  const within = (days: number) => (f: Fact) => Date.now() - Date.parse(f.end) <= days * DAY_MS;
  const results = (label: string, pred: (f: Fact) => boolean, maxAgeDays: number) => {
    const fresh = (f: Fact) => pred(f) && within(maxAgeDays)(f);
    const r = latestOf(revenue, fresh);
    const n = r ? samePeriod(net, r) : latestOf(net, fresh);
    const period = r ?? n;
    if (!period) return;
    const parts: string[] = [];
    if (r) parts.push(`revenue ${money(r.val)}${change(r.val, yearEarlier(revenue, r, pred)?.val)}`);
    const g = samePeriod(gross, period);
    const o = samePeriod(operating, period);
    if (r && g && r.val > 0) parts.push(`gross margin ${pct(g.val / r.val)}`);
    if (r && o && r.val > 0) parts.push(`operating margin ${pct(o.val / r.val)}`);
    if (n) parts.push(`net income ${money(n.val)}${r && r.val > 0 ? ` (net margin ${pct(n.val / r.val)})` : ""}${r ? "" : change(n.val, yearEarlier(net, n, pred)?.val)}`);
    const e = samePeriod(eps, period);
    if (e) parts.push(`diluted EPS $${e.val.toFixed(2)}`);
    lines.push(`${label} (${period.start} to ${period.end}, from the ${period.form} filed ${period.filed}): ${parts.join("; ")}.`);
  };
  results("Latest quarter", isQuarter, 220);
  results("Latest fiscal year", isYear, 500);

  const recentInstant = (f: Fact) => isInstant(f) && within(400)(f);
  const c = latestOf(cash, recentInstant);
  const d = latestOf(debt, recentInstant);
  const q = latestOf(equity, recentInstant);
  const balance: string[] = [];
  if (c) balance.push(`cash ${money(c.val)}`);
  if (d) balance.push(`long-term debt ${money(d.val)}`);
  if (q) balance.push(`shareholders' equity ${money(q.val)}${d && q.val > 0 ? ` (debt-to-equity ${(d.val / q.val).toFixed(2)})` : ""}`);
  const asOf = [c, d, q].filter(Boolean).map((f) => f!.end).sort().pop();
  if (balance.length) lines.push(`Balance sheet (as of ${asOf}): ${balance.join("; ")}.`);

  const ocf = latestOf(opCash, (f) => isYear(f) && within(500)(f));
  const cap = samePeriod(capex, ocf);
  if (ocf) {
    lines.push(
      `Cash flow, fiscal year to ${ocf.end}: operating cash flow ${money(ocf.val)}` +
        (cap ? `, capital spending ${money(cap.val)}, free cash flow ${money(ocf.val - cap.val)}.` : "."),
    );
  }
  return lines;
}

/** A company's latest results from its SEC filings, cached for hours (filings come quarterly). */
async function fundamentals(symbol: string): Promise<{ symbol: string; name?: string; lines: string[] }> {
  const key = `fund:${symbol}`;
  const hit = getCache(key);
  if (hit) return JSON.parse(hit);
  let out: { symbol: string; name?: string; lines: string[] } = { symbol, lines: [] };
  try {
    const co = await secCompany(symbol);
    if (co) {
      const r = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${String(co.cik).padStart(10, "0")}.json`, {
        headers: { "User-Agent": SEC_UA, Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      if (r.ok) {
        const j = await r.json();
        out = { symbol, name: co.title, lines: describeFinancials(j?.facts?.["us-gaap"]) };
      }
    }
  } catch (e) {
    console.warn("fundamentals failed", symbol, e instanceof Error ? e.message : e);
  }
  setCache(key, JSON.stringify(out), out.lines.length ? 6 * 60 * 60 * 1000 : 10 * 60 * 1000);
  return out;
}

function xmlHeaders() {
  return { headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8" } };
}
function jsonHeaders() {
  return { headers: { ...corsHeaders, "Content-Type": "application/json" } };
}
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { ...jsonHeaders(), status });
}
