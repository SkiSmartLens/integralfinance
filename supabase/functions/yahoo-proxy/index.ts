import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
      // EQUITY, ETF, MUTUALFUND, CRYPTOCURRENCY, INDEX, CURRENCY, FUTURE.
      quoteType: m.instrumentType,
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
    // company from every news feed, with article text where the feed has it,
    // and Yahoo Finance's stories about it.
    if (kind === "news") {
      const q = url.searchParams.get("q") ?? "";
      const name = url.searchParams.get("name") ?? "";
      if (!q && !name) return json({ error: "q or name required" }, 400);
      const limit = Math.min(12, Math.max(1, Number(url.searchParams.get("limit") ?? "8") || 8));
      return json({ stories: await newsAbout(q, name, limit) });
    }

    // For a stock's News tab: Yahoo Finance's stories about that one stock
    // (src/lib/yahoo.ts merges in the matching stories from the site's feeds).
    if (kind === "stocknews") {
      const symbol = (url.searchParams.get("symbol") ?? "").toUpperCase();
      if (!STOCK_SYMBOL.test(symbol)) return json({ error: "symbol required" }, 400);
      const name = (url.searchParams.get("name") ?? "").slice(0, 120);
      return json({ news: await stockStories(symbol, name) });
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
  /** The feed's ID for the story (for Yahoo's, the ID its translator lookup uses). */
  guid?: string;
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
      guid: tagValue(item, "guid") || undefined,
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

const STOCK_SYMBOL = /^[A-Z0-9^][A-Z0-9.\-=^]{0,11}$/;
// A story tagged with at most this many tickers is about them; more is a roundup.
const FOCUSED_TICKERS = 4;

/** A story in the shape the site's news cards use (NewsItem in src/lib/yahoo.ts). */
interface NewsItem {
  uuid: string;
  title: string;
  summary: string;
  publisher: string;
  link: string;
  providerPublishTime: number;
  type: string;
  thumbnail?: { resolutions: { url: string; width: number; height: number }[] };
  relatedTickers?: string[];
}

/**
 * Yahoo Finance's stories about one stock, newest first, so a small company the
 * general feeds never mention still has news. Its news search gives each
 * story's publisher, picture and tickers; its per-stock headline feed gives a
 * summary, which "AI Summarize" falls back on since Yahoo's pages can't be read
 * from the server. The feed is looser (Bitcoin's has XRP stories), so a story
 * only in the feed must name the company, as must a roundup. Cached a few minutes.
 */
async function stockStories(symbol: string, name: string): Promise<NewsItem[]> {
  const key = `stories:${symbol}:${name}`;
  const hit = getCache(key);
  if (hit) return JSON.parse(hit);
  const s = encodeURIComponent(symbol);
  const [search, feed] = await Promise.all([
    yahooFetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${s}&newsCount=20&quotesCount=0`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
    feedXml(`https://feeds.finance.yahoo.com/rss/2.0/headline?s=${s}&region=US&lang=en-US`),
  ]);
  const pats = storyPatterns(symbol, name);
  const names = (...texts: string[]) => texts.some((t) => pats.some((p) => p.test(t)));
  // The feed's guid is the search's story ID (the two give some stories different links).
  const fromFeed = new Map(parseFeed(feed, "Yahoo Finance").map((st) => [st.guid ?? st.url, st]));
  const out: NewsItem[] = [];
  for (const n of (search?.news ?? []) as NewsItem[]) {
    if (!n?.title || !n.link || !n.relatedTickers?.includes(symbol)) continue;
    const summary = fromFeed.get(n.uuid)?.summary ?? "";
    fromFeed.delete(n.uuid);
    // Market roundups are tagged with a dozen tickers: those must name the company.
    if (n.relatedTickers.length > FOCUSED_TICKERS && !names(n.title, summary)) continue;
    out.push({
      uuid: n.uuid,
      title: n.title,
      summary,
      publisher: n.publisher || "Yahoo Finance",
      link: n.link,
      providerPublishTime: n.providerPublishTime,
      type: "STORY",
      ...(n.thumbnail ? { thumbnail: n.thumbnail } : {}),
      relatedTickers: n.relatedTickers,
    });
  }
  for (const st of fromFeed.values()) {
    if (!names(st.title, st.summary)) continue;
    out.push({
      uuid: st.guid ?? st.url,
      title: st.title,
      summary: st.summary,
      publisher: st.publisher,
      link: st.url.replace(/\?\.tsrc=rss$/, ""),
      providerPublishTime: st.published,
      type: "STORY",
    });
  }
  out.sort((a, b) => b.providerPublishTime - a.providerPublishTime);
  if (out.length) setCache(key, JSON.stringify(out), 3 * 60 * 1000);
  return out;
}

/** Stories from the last 10 days whose headline or summary names the company, newest first. */
async function newsAbout(ticker: string, name: string, limit: number): Promise<Story[]> {
  const pats = storyPatterns(ticker, name);
  if (!pats.length) return [];
  const symbol = ticker.trim().toUpperCase();
  const [feeds, yahoo] = await Promise.all([
    Promise.all(NEWS_FEEDS.map(async (f) => parseFeed(await feedXml(f.url), f.publisher))),
    STOCK_SYMBOL.test(symbol) ? stockStories(symbol, name).catch(() => []) : [],
  ]);
  // Yahoo's are all about this company, so they need no name check.
  const fromYahoo: Story[] = yahoo.map((n) => ({
    title: n.title,
    publisher: n.publisher,
    url: n.link,
    published: n.providerPublishTime,
    summary: n.summary,
    text: "",
  }));
  const cutoff = Date.now() / 1000 - 10 * 86400;
  const seen = new Set<string>();
  return [...feeds.flat().filter((s) => pats.some((p) => p.test(s.title) || p.test(s.summary))), ...fromYahoo]
    .filter((s) => s.published >= cutoff)
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
    // Not "unknown company": the SEC turned us away, which callers treat differently.
    if (!r.ok) throw new Error(`SEC company list ${r.status}`);
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
// Twelve months from an annual report (some 10-Qs also give trailing twelve-month cash flows).
const ANNUAL_FORMS = /^(10-K|20-F|40-F)/;
const isAnnual = (f: Fact) => isYear(f) && ANNUAL_FORMS.test(f.form);
const isNineMonths = (f: Fact) => spanDays(f) >= 260 && spanDays(f) <= 285;
const isInstant = (f: Fact) => !f.start;
const near = (a: string, b: string, days: number) => Math.abs(Date.parse(a) - Date.parse(b)) <= days * DAY_MS;
const yearsBefore = (iso: string, years: number) => new Date(Date.parse(iso) - years * 365.25 * DAY_MS).toISOString().slice(0, 10);

// Annual and quarterly reports (US companies file 10-K/10-Q, foreign ones 20-F/40-F).
const REPORT_FORMS = /^(10-K|10-Q|20-F|40-F)/;

/** Which taxonomy's tag to use for each line item: US GAAP, or IFRS for many foreign companies. */
const TAGS = {
  revenue: {
    "us-gaap": ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "RevenuesNetOfInterestExpense", "SalesRevenueNet", "RevenueFromContractWithCustomerIncludingAssessedTax"],
    "ifrs-full": ["Revenue", "RevenueFromContractsWithCustomers"],
  },
  gross: { "us-gaap": ["GrossProfit"], "ifrs-full": ["GrossProfit"] },
  operating: { "us-gaap": ["OperatingIncomeLoss"], "ifrs-full": ["ProfitLossFromOperatingActivities"] },
  net: { "us-gaap": ["NetIncomeLoss", "ProfitLoss"], "ifrs-full": ["ProfitLossAttributableToOwnersOfParent", "ProfitLoss"] },
  eps: { "us-gaap": ["EarningsPerShareDiluted", "EarningsPerShareBasic"], "ifrs-full": ["DilutedEarningsLossPerShare", "BasicEarningsLossPerShare"] },
  cash: { "us-gaap": ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents", "CashAndDueFromBanks"], "ifrs-full": ["CashAndCashEquivalents"] },
  investments: { "us-gaap": ["MarketableSecuritiesCurrent", "ShortTermInvestments", "AvailableForSaleSecuritiesDebtSecuritiesCurrent"], "ifrs-full": ["CurrentInvestments", "OtherCurrentFinancialAssets"] },
  debt: { "us-gaap": ["LongTermDebtNoncurrent", "LongTermDebt", "LongTermDebtAndCapitalLeaseObligations"], "ifrs-full": ["NoncurrentPortionOfNoncurrentBorrowings", "LongtermBorrowings", "Borrowings"] },
  debtCurrent: { "us-gaap": ["LongTermDebtCurrent", "DebtCurrent"], "ifrs-full": ["CurrentPortionOfNoncurrentBorrowings", "ShorttermBorrowings"] },
  equity: { "us-gaap": ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"], "ifrs-full": ["EquityAttributableToOwnersOfParent", "Equity"] },
  opCash: { "us-gaap": ["NetCashProvidedByUsedInOperatingActivities"], "ifrs-full": ["CashFlowsFromUsedInOperatingActivities"] },
  capex: { "us-gaap": ["PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets"], "ifrs-full": ["PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities"] },
  dividends: { "us-gaap": ["PaymentsOfDividendsCommonStock", "PaymentsOfDividends"], "ifrs-full": ["DividendsPaidClassifiedAsFinancingActivities"] },
  buybacks: { "us-gaap": ["PaymentsForRepurchaseOfCommonStock"], "ifrs-full": ["PaymentsToAcquireOrRedeemEntitysShares"] },
  rnd: { "us-gaap": ["ResearchAndDevelopmentExpense", "ResearchAndDevelopmentExpenseExcludingAcquiredInProcessCost"], "ifrs-full": ["ResearchAndDevelopmentExpense"] },
  shares: { "us-gaap": ["WeightedAverageNumberOfDilutedSharesOutstanding"], "ifrs-full": ["AdjustedWeightedAverageShares", "WeightedAverageShares"] },
} as const;
type Taxonomy = "us-gaap" | "ifrs-full";

/**
 * One line item, using whichever of `tags` the company reported most recently
 * (they switch, e.g. Revenues vs. RevenueFromContractWithCustomer...). One value
 * per period; a later filing's restatement wins. Oldest first.
 */
// deno-lint-ignore no-explicit-any
function lineItem(tax: any, tags: readonly string[], unit: string): Fact[] {
  let best: Fact[] = [];
  let bestEnd = "";
  for (const tag of tags) {
    const vals = ((tax?.[tag]?.units?.[unit] ?? []) as Fact[]).filter(
      (f) => REPORT_FORMS.test(f.form) && typeof f.val === "number" && !!f.end,
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
  f ? list.find((x) => pred(x) && near(x.end, yearsBefore(f.end, 1), 20)) : undefined;

/** Fiscal-year values from annual reports, one per year, newest last (up to `n`). */
function fiscalYears(list: Fact[], n: number): Fact[] {
  const years = list.filter(isAnnual);
  const out: Fact[] = [];
  for (const f of [...years].reverse()) {
    if (out.some((o) => near(o.end, f.end, 300))) continue;
    out.unshift(f);
    if (out.length >= n) break;
  }
  return out;
}

/**
 * Quarters, including fourth quarters worked out as the fiscal year minus its
 * first nine months (annual reports don't state the fourth quarter on its own).
 */
function quarters(list: Fact[]): Fact[] {
  const out = list.filter(isQuarter);
  for (const y of list.filter(isAnnual)) {
    if (out.some((q) => near(q.end, y.end, 5))) continue;
    const nine = list.find((x) => isNineMonths(x) && x.start && near(x.start, y.start!, 5));
    if (nine) out.push({ start: nine.end, end: y.end, val: y.val - nine.val, form: y.form, filed: y.filed });
  }
  return out.sort((a, b) => a.end.localeCompare(b.end));
}

/** The last four quarters back to back, ending with the latest one, or null. */
function lastFourQuarters(qs: Fact[]): Fact[] | null {
  const latest = qs[qs.length - 1];
  if (!latest) return null;
  const four = [latest];
  for (let i = 1; i < 4; i++) {
    const prev = qs.find((q) => near(q.end, four[0].start ?? yearsBefore(four[0].end, 0.25), 12) && q !== four[0]);
    if (!prev) return null;
    four.unshift(prev);
  }
  return four;
}

function makeMoney(currency: string) {
  return (n: number): string => {
    const a = Math.abs(n);
    const s = a >= 1e12 ? `${(a / 1e12).toFixed(2)}T` : a >= 1e9 ? `${(a / 1e9).toFixed(1)}B` : a >= 1e6 ? `${(a / 1e6).toFixed(0)}M` : a.toFixed(0);
    return `${n < 0 ? "-" : ""}${currency === "USD" ? "$" : `${currency} `}${s}`;
  };
}
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const growth = (now: number, before?: number) =>
  before && before > 0 ? `${now >= before ? "+" : "-"}${(Math.abs(now / before - 1) * 100).toFixed(1)}%` : null;
const fy = (f: Fact) => `FY${f.end.slice(0, 4)}`;

/**
 * Picks US GAAP or IFRS, whichever the company reports its results in more
 * recently, and the currency it reports in (the one with the most revenue
 * and profit figures; some foreign filers add a US-dollar translation for the
 * latest year only).
 */
// deno-lint-ignore no-explicit-any
function pickBasis(facts: any): { taxonomy: Taxonomy; currency: string } | null {
  let best: { taxonomy: Taxonomy; currency: string; end: string } | null = null;
  for (const taxonomy of ["us-gaap", "ifrs-full"] as const) {
    const tax = facts?.[taxonomy];
    if (!tax) continue;
    const counts = new Map<string, number>();
    let end = "";
    for (const tag of [...TAGS.revenue[taxonomy], ...TAGS.net[taxonomy]]) {
      for (const [unit, vals] of Object.entries(tax[tag]?.units ?? {})) {
        if (!/^[A-Z]{3}$/.test(unit)) continue;
        const list = (vals as Fact[]).filter((f) => REPORT_FORMS.test(f.form));
        counts.set(unit, (counts.get(unit) ?? 0) + list.length);
        for (const f of list) if (f.end > end) end = f.end;
      }
    }
    const currency = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (currency && (!best || end > best.end)) best = { taxonomy, currency, end };
  }
  return best && { taxonomy: best.taxonomy, currency: best.currency };
}

/** Plain-English lines about a company's results and history, for an AI prompt. */
// deno-lint-ignore no-explicit-any
function describeFinancials(facts: any): string[] {
  const basis = pickBasis(facts);
  if (!basis) return [];
  const { taxonomy, currency } = basis;
  const tax = facts[taxonomy];
  const get = (key: keyof typeof TAGS, unit = currency) => lineItem(tax, TAGS[key][taxonomy], unit);
  const money = makeMoney(currency);

  const revenue = get("revenue");
  const gross = get("gross");
  const operating = get("operating");
  const net = get("net");
  const eps = get("eps", `${currency}/shares`);
  const lines: string[] = [];
  if (currency !== "USD") lines.push(`Figures are in ${currency}, the currency the company reports in.`);

  // A company can stop using a line item for one kind of period (a bank's
  // quarterly revenue ending in 2014), so the latest period has to be recent.
  const within = (days: number) => (f: Fact) => Date.now() - Date.parse(f.end) <= days * DAY_MS;
  const results = (label: string, pred: (f: Fact) => boolean, maxAgeDays: number) => {
    const fresh = (f: Fact) => pred(f) && within(maxAgeDays)(f);
    const r = latestOf(revenue, fresh);
    const n = r ? samePeriod(net, r) : latestOf(net, fresh);
    const period = r ?? n;
    if (!period) return false;
    const parts: string[] = [];
    if (r) {
      const g = growth(r.val, yearEarlier(revenue, r, pred)?.val);
      parts.push(`revenue ${money(r.val)}${g ? ` (${g} from a year earlier)` : ""}`);
    }
    const gp = samePeriod(gross, period);
    const op = samePeriod(operating, period);
    if (r && gp && r.val > 0) parts.push(`gross margin ${pct(gp.val / r.val)}`);
    if (r && op && r.val > 0) parts.push(`operating margin ${pct(op.val / r.val)}`);
    if (n) {
      const g = growth(n.val, yearEarlier(net, n, pred)?.val);
      parts.push(`net income ${money(n.val)}${r && r.val > 0 ? ` (net margin ${pct(n.val / r.val)})` : ""}${g ? `, ${g} from a year earlier` : ""}`);
    }
    const e = samePeriod(eps, period);
    if (e) {
      const g = growth(e.val, yearEarlier(eps, e, pred)?.val);
      parts.push(`diluted EPS ${e.val.toFixed(2)}${g ? ` (${g})` : ""}`);
    }
    lines.push(`${label} (${period.start} to ${period.end}, from the ${period.form} filed ${period.filed}): ${parts.join("; ")}.`);
    return true;
  };
  results("Latest quarter", isQuarter, 220);
  // Companies that report only once a year (many foreign ones) can be ~20 months behind.
  if (!results("Latest fiscal year", isAnnual, 500)) results("Latest fiscal year", isAnnual, 820);

  // The last twelve months, from the last four quarters.
  const revQ = quarters(revenue);
  const netQ = quarters(net);
  const four = lastFourQuarters(revQ);
  if (four && within(220)(four[3]) && isYear({ ...four[3], start: four[0].start })) {
    const ttm = four.reduce((s, q) => s + q.val, 0);
    const netFour = four.map((q) => samePeriod(netQ, q));
    const netTtm = netFour.every(Boolean) ? netFour.reduce((s, q) => s + q!.val, 0) : null;
    lines.push(
      `Last 12 months (${four[0].start} to ${four[3].end}): revenue ${money(ttm)}${netTtm != null ? `, net income ${money(netTtm)}` : ""}.`,
    );
  }

  // Recent quarters' growth, oldest first.
  const recentQ = revQ.filter(within(500)).slice(-5);
  const qGrowth = recentQ
    .map((q) => {
      const g = growth(q.val, revQ.find((x) => near(x.end, yearsBefore(q.end, 1), 20))?.val);
      return g ? `${q.end.slice(0, 7)} ${money(q.val)} (${g})` : null;
    })
    .filter(Boolean);
  if (qGrowth.length >= 3) lines.push(`Quarterly revenue and growth from a year earlier, by quarter end: ${qGrowth.join("; ")}.`);

  // Five-year history.
  const revYears = fiscalYears(revenue, 5);
  if (revYears.length >= 3) {
    const first = revYears[0];
    const last = revYears[revYears.length - 1];
    const span = (Date.parse(last.end) - Date.parse(first.end)) / (365.25 * DAY_MS);
    const cagr = first.val > 0 && last.val > 0 && span >= 1.5 ? (Math.pow(last.val / first.val, 1 / span) - 1) * 100 : null;
    lines.push(
      `Revenue by fiscal year: ${revYears.map((f) => `${fy(f)} ${money(f.val)}`).join(", ")}${cagr != null ? ` (about ${cagr >= 0 ? "+" : ""}${cagr.toFixed(1)}% a year)` : ""}.`,
    );
  }
  // Per-share figures change with stock splits, and only the latest annual report
  // restates earlier years for the latest split, so the history comes from it alone.
  const latestEps = latestOf(eps, isAnnual);
  const epsYears = fiscalYears(eps.filter((f) => f.filed === latestEps?.filed), 5);
  if (epsYears.length >= 2) lines.push(`Diluted EPS by fiscal year: ${epsYears.map((f) => `${fy(f)} ${f.val.toFixed(2)}`).join(", ")}.`);
  const netYears = fiscalYears(net, 5);
  if (netYears.length >= 3) lines.push(`Net income by fiscal year: ${netYears.map((f) => `${fy(f)} ${money(f.val)}`).join(", ")}.`);
  const marginYears = revYears
    .map((r) => {
      const o = samePeriod(operating, r);
      return o && r.val > 0 ? `${fy(r)} ${pct(o.val / r.val)}` : null;
    })
    .filter(Boolean);
  if (marginYears.length >= 3) lines.push(`Operating margin by fiscal year: ${marginYears.join(", ")}.`);

  // Balance sheet.
  // Annual-only filers' latest balance sheet can be ~20 months old.
  const recentInstant = (f: Fact) => isInstant(f) && within(820)(f);
  const c = latestOf(get("cash"), recentInstant);
  const inv = c ? samePeriod(get("investments"), c) : undefined;
  const d = latestOf(get("debt"), recentInstant);
  const dc = d ? samePeriod(get("debtCurrent"), d) : undefined;
  const q = latestOf(get("equity"), recentInstant);
  const balance: string[] = [];
  if (c) balance.push(`cash ${money(c.val)}${inv ? ` plus ${money(inv.val)} of short-term investments` : ""}`);
  if (d) balance.push(`long-term debt ${money(d.val)}${dc ? ` plus ${money(dc.val)} due within a year` : ""}`);
  if (q) balance.push(`shareholders' equity ${money(q.val)}${d && q.val > 0 ? ` (debt-to-equity ${((d.val + (dc?.val ?? 0)) / q.val).toFixed(2)})` : ""}`);
  const asOf = [c, d, q].filter(Boolean).map((f) => f!.end).sort().pop();
  if (balance.length) lines.push(`Balance sheet (as of ${asOf}): ${balance.join("; ")}.`);

  // Cash flow and what was returned to shareholders, latest fiscal year.
  const ocf = latestOf(get("opCash"), (f) => isYear(f) && within(820)(f));
  if (ocf) {
    const period = isAnnual(ocf) ? `fiscal year to ${ocf.end}` : `12 months to ${ocf.end}`;
    const cap = samePeriod(get("capex"), ocf);
    const rev = samePeriod(revenue, ocf);
    const fcf = cap ? ocf.val - cap.val : null;
    lines.push(
      `Cash flow, ${period}: operating cash flow ${money(ocf.val)}` +
        (cap && fcf != null ? `, capital spending ${money(cap.val)}, free cash flow ${money(fcf)}${rev && rev.val > 0 ? ` (${pct(fcf / rev.val)} of revenue)` : ""}` : "") +
        ".",
    );
    const div = samePeriod(get("dividends"), ocf);
    const buy = samePeriod(get("buybacks"), ocf);
    if (div || buy) {
      lines.push(
        `Returned to shareholders in those 12 months: ${[div && `${money(div.val)} in dividends`, buy && `${money(buy.val)} in share buybacks`].filter(Boolean).join(" and ")}.`,
      );
    }
  }

  // Share count across the latest annual report's years (buybacks shrink it, new
  // stock grows it); one report's figures share the same split adjustment.
  const shares = lineItem(tax, TAGS.shares[taxonomy], "shares").filter(isAnnual);
  const sNow = latestOf(shares, within(820));
  const sThen = sNow ? shares.find((f) => f.filed === sNow.filed && f.end < sNow.end) : undefined;
  if (sNow && sThen && sThen.val > 0) {
    const ch = sNow.val / sThen.val - 1;
    const span = `from ${fy(sThen)} to ${fy(sNow)}`;
    lines.push(
      Math.abs(ch) < 0.005
        ? `Diluted share count was about flat ${span}.`
        : `Diluted share count ${ch < 0 ? "fell" : "rose"} ${pct(Math.abs(ch))} ${span} (${ch < 0 ? "buybacks" : "new shares issued"}).`,
    );
  }

  // Research spending.
  const rnd = latestOf(get("rnd"), (f) => isAnnual(f) && within(820)(f));
  const rndRev = rnd ? samePeriod(revenue, rnd) : undefined;
  if (rnd && rndRev && rndRev.val > 0) lines.push(`Research and development, fiscal year to ${rnd.end}: ${money(rnd.val)} (${pct(rnd.val / rndRev.val)} of revenue).`);

  return lines;
}

const FUNDAMENTALS_MODE = "fundamentals";
// Bump when the lines change shape: older saved copies are then ignored.
const FUNDAMENTALS_VERSION = "f2";

type Fundamentals = {
  symbol: string;
  name?: string;
  lines: string[];
  /**
   * "ok": lines from the SEC. "none": the SEC has nothing to describe (a fund, a
   * coin, a company that doesn't file there). "unavailable": the SEC couldn't be
   * reached and there's no saved copy, so callers shouldn't keep an answer built
   * without these figures for long.
   */
  status: "ok" | "none" | "unavailable";
  /** Set when the SEC couldn't be reached and these are the last saved figures. */
  savedAt?: string;
};

/**
 * A company's results from its SEC filings. Kept in memory for hours and in the
 * database for a day (filings come quarterly). The SEC sometimes turns away
 * requests from shared cloud servers for a while; then the last saved copy (up
 * to a year old, and dated) is used instead of nothing.
 */
async function fundamentals(symbol: string): Promise<Fundamentals> {
  const key = `fund:${symbol}`;
  const hit = getCache(key);
  if (hit) return JSON.parse(hit);

  const saved = await readSaved(symbol);
  if (saved && saved.exp > Date.now()) {
    setCache(key, JSON.stringify(saved.body), 6 * 60 * 60 * 1000);
    return saved.body;
  }

  let out: Fundamentals = { symbol, lines: [], status: "none" };
  try {
    const co = await secCompany(symbol);
    if (co) {
      const r = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${String(co.cik).padStart(10, "0")}.json`, {
        headers: { "User-Agent": SEC_UA, Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      if (r.ok) {
        const j = await r.json();
        const lines = describeFinancials(j?.facts);
        out = { symbol, name: co.title, lines, status: lines.length ? "ok" : "none" };
      } else if (r.status !== 404) {
        console.warn("SEC companyfacts", symbol, r.status);
        out.status = "unavailable";
      }
    }
  } catch (e) {
    console.warn("fundamentals failed", symbol, e instanceof Error ? e.message : e);
    out.status = "unavailable";
  }

  if (out.status === "ok") {
    setCache(key, JSON.stringify(out), 6 * 60 * 60 * 1000);
    await save(symbol, out, Date.now() + DAY_MS);
    return out;
  }
  if (out.status === "unavailable" && saved) {
    const body: Fundamentals = { ...saved.body, savedAt: saved.updatedAt };
    setCache(key, JSON.stringify(body), 10 * 60 * 1000);
    return body;
  }
  setCache(key, JSON.stringify(out), 10 * 60 * 1000);
  return out;
}

// Saved copies live in public.stock_summary_cache (service role only). Any failure is just a miss.
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const db = SERVICE_ROLE ? createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_ROLE, { auth: { persistSession: false } }) : null;

async function readSaved(symbol: string): Promise<{ body: Fundamentals; exp: number; updatedAt: string } | null> {
  if (!db) return null;
  try {
    const { data, error } = await db
      .from("stock_summary_cache")
      .select("body, expires_at, updated_at")
      .eq("symbol", symbol)
      .eq("mode", FUNDAMENTALS_MODE)
      .eq("version", FUNDAMENTALS_VERSION)
      .gt("expires_at", new Date(Date.now() - 365 * DAY_MS).toISOString())
      .abortSignal(AbortSignal.timeout(1500))
      .maybeSingle();
    if (error || !data) return null;
    return { body: data.body as Fundamentals, exp: Date.parse(data.expires_at), updatedAt: data.updated_at };
  } catch {
    return null;
  }
}

async function save(symbol: string, body: Fundamentals, exp: number) {
  if (!db) return;
  try {
    const { error } = await db
      .from("stock_summary_cache")
      .upsert(
        { symbol, mode: FUNDAMENTALS_MODE, version: FUNDAMENTALS_VERSION, body, expires_at: new Date(exp).toISOString(), updated_at: new Date().toISOString() },
        { onConflict: "symbol,mode" },
      )
      .abortSignal(AbortSignal.timeout(2000));
    if (error) console.warn("fundamentals save failed", error.message);
  } catch (e) {
    console.warn("fundamentals save threw", e instanceof Error ? e.message : e);
  }
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
