const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Tiny in-memory TTL cache
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

// Try to fetch market cap (and a few extra fields) via quoteSummary "price" module.
async function fetchMarketCap(symbol: string): Promise<number | undefined> {
  const tryHosts = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
  for (const host of tryHosts) {
    try {
      const r = await yahooFetch(
        `https://${host}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=price`
      );
      if (!r.ok) continue;
      const j = await r.json();
      const p = j?.quoteSummary?.result?.[0]?.price;
      const cap = p?.marketCap?.raw ?? p?.marketCap;
      if (typeof cap === "number" && Number.isFinite(cap)) return cap;
    } catch {
      // try next
    }
  }
  return undefined;
}

// Get a "quote-like" object derived from chart meta (works without crumb).
async function chartMetaQuote(symbol: string): Promise<any | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?range=1d&interval=1m&includePrePost=false`;
  try {
    const [r, marketCap] = await Promise.all([yahooFetch(url), fetchMarketCap(symbol)]);
    if (!r.ok) {
      await r.text();
      return { symbol, error: `HTTP ${r.status}`, marketCap };
    }
    const j = await r.json();
    const result = j?.chart?.result?.[0];
    const m = result?.meta;
    if (!m) return { symbol, error: "no meta", marketCap };
    const price = m.regularMarketPrice;
    const prev = m.chartPreviousClose ?? m.previousClose;
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
      marketCap,
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
      if (!symbols.length) {
        return json({ error: "symbols required" }, 400);
      }
      const cacheKey = "q:" + symbols.join(",");
      const cached = getCache(cacheKey);
      if (cached) return new Response(cached, jsonHeaders());

      const results = await Promise.all(symbols.map((s) => chartMetaQuote(s)));
      const body = JSON.stringify({
        quoteResponse: { result: results.filter(Boolean) },
      });
      setCache(cacheKey, body, 8000);
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
      if (r.ok) setCache(cacheKey, body, 10000);
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
