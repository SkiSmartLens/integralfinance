// Yahoo Finance fetch helpers via public CORS proxy. No API keys, no caching.
const PROXY = "https://corsproxy.io/?";

function proxied(url: string) {
  return PROXY + encodeURIComponent(url);
}

export interface Quote {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketPreviousClose?: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  currency?: string;
  exchange?: string;
  quoteType?: string;
}

export async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  if (!symbols.length) return [];
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(",")}`;
  const res = await fetch(proxied(url));
  if (!res.ok) throw new Error("Failed to fetch quotes");
  const data = await res.json();
  return data?.quoteResponse?.result ?? [];
}

export interface ChartPoint {
  t: number;
  price: number;
}

export interface ChartResult {
  symbol: string;
  points: ChartPoint[];
  previousClose?: number;
  meta?: any;
}

export async function fetchChart(
  symbol: string,
  range: string,
  interval: string
): Promise<ChartResult> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}&includePrePost=false`;
  const res = await fetch(proxied(url));
  if (!res.ok) throw new Error("Failed to fetch chart");
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) return { symbol, points: [] };
  const ts: number[] = result.timestamp ?? [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
  const points: ChartPoint[] = ts
    .map((t, i) => ({ t: t * 1000, price: closes[i] as number }))
    .filter((p) => typeof p.price === "number" && !isNaN(p.price));
  return {
    symbol,
    points,
    previousClose:
      result.meta?.chartPreviousClose ?? result.meta?.previousClose,
    meta: result.meta,
  };
}

export interface NewsItem {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: number;
  type: string;
  thumbnail?: { resolutions: { url: string; width: number; height: number }[] };
  relatedTickers?: string[];
}

export async function fetchNews(query = "stock market"): Promise<NewsItem[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    query
  )}&newsCount=20&quotesCount=0`;
  const res = await fetch(proxied(url));
  if (!res.ok) throw new Error("Failed to fetch news");
  const data = await res.json();
  return data?.news ?? [];
}

export function formatNumber(n?: number, opts?: Intl.NumberFormatOptions) {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    ...opts,
  }).format(n);
}

export function formatLargeNumber(n?: number) {
  if (n == null) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toString();
}
