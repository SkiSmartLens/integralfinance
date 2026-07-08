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
      const upstream =
        `https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}` +
        (date ? `?date=${encodeURIComponent(date)}` : "");
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
