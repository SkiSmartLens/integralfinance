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
}

// Parse "4.344T" / "12.3B" / "987M" style strings into a number.
function parseAbbrev(s: string): number | undefined {
  if (!s) return undefined;
  const m = s.replace(/,/g, "").trim().match(/^([0-9]*\.?[0-9]+)\s*([TBMK])?/i);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  const mult = { T: 1e12, B: 1e9, M: 1e6, K: 1e3 }[(m[2] || "").toUpperCase()] ?? 1;
  return n * mult;
}

const metaCache = new Map<string, { exp: number; data: MetaExtra }>();

// Scrape the public Yahoo quote page — it embeds marketCap / PE / earnings date
// in fin-streamer tags and label/value list items. Works without a crumb.
async function scrapeQuotePage(symbol: string): Promise<MetaExtra> {
  const out: MetaExtra = {};
  try {
    const r = await fetch(
      `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/`,
      {
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          // Bypass EU consent redirect (Yahoo otherwise sends a stub page)
          Cookie: "EuConsent=CPo9V0APo9V0AAOACBENCfCgAP_AAH_AAAYgIxNV_H__bX9j-_5_aft0eY1P9_r37uQzDhfNk-8F3L_W_LwX52E7NF36tq4KmR4ku3LBIQNlHMHUTUmwaokVryHsak2cpzNKJ7BEknMZOydYGF9vmxtj-YKY7v_v__7v3___77_-r___bQ9V_r_AAAAAAA; A1=d=AQABBOXyP2cCEOgcWZw_iZ-PRsy_d4tgvRkFEgEBCAH7P2qxZ2eQyyMA_eMAAA&S=AQAAAhwq3qOTd9Y1F9rmJ6m2qnQ; A3=d=AQABBOXyP2cCEOgcWZw_iZ-PRsy_d4tgvRkFEgEBCAH7P2qxZ2eQyyMA_eMAAA&S=AQAAAhwq3qOTd9Y1F9rmJ6m2qnQ; GUC=AQEBCAFnP_tqsEIfXgT4; A1S=d=AQABBOXyP2cCEOgcWZw_iZ-PRsy_d4tgvRkFEgEBCAH7P2qxZ2eQyyMA_eMAAA&S=AQAAAhwq3qOTd9Y1F9rmJ6m2qnQ",
        },
        redirect: "follow",
      },
    );
    if (!r.ok) {
      console.warn("scrape fail", symbol, r.status, r.url);
      return out;
    }
    const html = await r.text();
    if (!/data-field="marketCap"/.test(html)) {
      console.warn("scrape no marketCap field", symbol, "len", html.length, "url", r.url);
    }

    const grab = (field: string) => {
      // <fin-streamer data-value="4.344T" ... data-field="marketCap" ...>
      const re = new RegExp(
        `data-value="([^"]+)"[^>]*data-field="${field}"`,
        "i",
      );
      const m = html.match(re);
      return m?.[1];
    };

    const cap = grab("marketCap");
    if (cap) out.marketCap = parseAbbrev(cap);
    const pe = grab("trailingPE");
    if (pe) out.trailingPE = parseFloat(pe);
    const fpe = grab("forwardPE");
    if (fpe) out.forwardPE = parseFloat(fpe);
    const eps = grab("epsTrailingTwelveMonths") ?? grab("trailingEps");
    if (eps) out.epsTrailingTwelveMonths = parseFloat(eps);

    // Earnings Date (est.) "Jul 30, 2026" or range "Jul 28 - Aug 1, 2026"
    const eM = html.match(
      /Earnings Date[^"]*"[^>]*>[^<]*<\/span>\s*<span[^>]*>([^<]+?)<\/span>/i,
    );
    if (eM) {
      const raw = eM[1].trim();
      // Take last date if range like "Jul 28 - Aug 1, 2026"
      const last = raw.split(/\s*[-–]\s*/).pop() ?? raw;
      const t = Date.parse(last);
      if (!isNaN(t)) {
        out.earningsTimestamp = Math.floor(t / 1000);
        out.earningsTimestampStart = out.earningsTimestamp;
        out.earningsTimestampEnd = out.earningsTimestamp;
      }
    }

    // Dividend & Yield "1.08 (0.36%)"
    const dM = html.match(/Forward Dividend[^>]*>[^<]*<\/span>\s*<span[^>]*>([^<]+)<\/span>/i);
    if (dM) {
      const pm = dM[1].match(/\(([0-9.]+)%\)/);
      if (pm) out.dividendYield = parseFloat(pm[1]) / 100;
    }
  } catch { /* ignore */ }
  return out;
}

// Try Yahoo JSON endpoints (often blocked); fall back to scraping the public quote page.
async function fetchMeta(symbol: string, priceHint?: number): Promise<MetaExtra> {
  const cached = metaCache.get(symbol);
  if (cached && cached.exp > Date.now()) return cached.data;

  const enc = encodeURIComponent(symbol);
  const hosts = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
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
  };

  // 1) options endpoint (sometimes uncrumb)
  for (const host of hosts) {
    try {
      const r = await yahooFetch(`https://${host}/v7/finance/options/${enc}`);
      if (!r.ok) continue;
      const j = await r.json();
      merge(j?.optionChain?.result?.[0]?.quote);
      if (out.marketCap && out.earningsTimestamp) break;
    } catch { /* ignore */ }
  }

  // 2) HTML scrape fallback — most reliable today
  if (!out.marketCap || !out.trailingPE || !out.earningsTimestamp) {
    const scraped = await scrapeQuotePage(symbol);
    merge(scraped);
  }

  if (!out.marketCap && out.sharesOutstanding && typeof priceHint === "number") {
    out.marketCap = out.sharesOutstanding * priceHint;
  }
  if (out.trailingPE == null && out.epsTrailingTwelveMonths && out.epsTrailingTwelveMonths > 0 && typeof priceHint === "number") {
    out.trailingPE = priceHint / out.epsTrailingTwelveMonths;
  }

  metaCache.set(symbol, { exp: Date.now() + 5 * 60 * 1000, data: out });
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

    return json({ error: "invalid kind" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return json({ error: msg }, 500);
  }
});

function jsonHeaders() {
  return { headers: { ...corsHeaders, "Content-Type": "application/json" } };
}
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { ...jsonHeaders(), status });
}
