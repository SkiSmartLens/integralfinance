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

// Try several Yahoo endpoints to extract market cap, P/E, and next earnings.
async function fetchMeta(symbol: string, priceHint?: number): Promise<MetaExtra> {
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

  // 1) v7/finance/quote
  for (const host of hosts) {
    if (out.marketCap && out.trailingPE && out.earningsTimestamp) break;
    try {
      const r = await yahooFetch(`https://${host}/v7/finance/quote?symbols=${enc}`);
      if (!r.ok) continue;
      const j = await r.json();
      merge(j?.quoteResponse?.result?.[0]);
    } catch { /* ignore */ }
  }

  // 2) options endpoint (often works without crumb, returns a .quote subobject)
  if (!out.marketCap || !out.earningsTimestamp) {
    for (const host of hosts) {
      try {
        const r = await yahooFetch(`https://${host}/v7/finance/options/${enc}`);
        if (!r.ok) continue;
        const j = await r.json();
        merge(j?.optionChain?.result?.[0]?.quote);
        if (out.marketCap && out.earningsTimestamp) break;
      } catch { /* ignore */ }
    }
  }

  // 3) quoteSummary modules
  if (!out.marketCap || !out.earningsTimestamp) {
    for (const host of hosts) {
      try {
        const r = await yahooFetch(
          `https://${host}/v10/finance/quoteSummary/${enc}?modules=price,summaryDetail,defaultKeyStatistics,calendarEvents,earnings`,
        );
        if (!r.ok) continue;
        const j = await r.json();
        const res = j?.quoteSummary?.result?.[0];
        const cap = res?.price?.marketCap?.raw ?? res?.summaryDetail?.marketCap?.raw;
        const so = res?.defaultKeyStatistics?.sharesOutstanding?.raw;
        const pe = res?.summaryDetail?.trailingPE?.raw;
        const fpe = res?.summaryDetail?.forwardPE?.raw ?? res?.defaultKeyStatistics?.forwardPE?.raw;
        const eps = res?.defaultKeyStatistics?.trailingEps?.raw;
        const dy = res?.summaryDetail?.dividendYield?.raw;
        const earningsDates = res?.calendarEvents?.earnings?.earningsDate;
        const eTs = Array.isArray(earningsDates) && earningsDates[0]?.raw;
        const eTsEnd = Array.isArray(earningsDates) && earningsDates[1]?.raw;
        merge({
          marketCap: cap, sharesOutstanding: so, trailingPE: pe, forwardPE: fpe,
          epsTrailingTwelveMonths: eps, dividendYield: dy,
          earningsTimestamp: eTs, earningsTimestampStart: eTs, earningsTimestampEnd: eTsEnd || eTs,
        });
        if (out.marketCap && out.earningsTimestamp) break;
      } catch { /* ignore */ }
    }
  }

  // Compute market cap from shares × price if still missing
  if (!out.marketCap && out.sharesOutstanding && typeof priceHint === "number") {
    out.marketCap = out.sharesOutstanding * priceHint;
  }
  // Compute P/E from price/eps if missing
  if (out.trailingPE == null && out.epsTrailingTwelveMonths && out.epsTrailingTwelveMonths > 0 && typeof priceHint === "number") {
    out.trailingPE = priceHint / out.epsTrailingTwelveMonths;
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
