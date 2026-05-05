// Yahoo Finance fetch helpers via our own backend edge function (no flaky public proxies).
import { supabase } from "@/integrations/supabase/client";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/yahoo-proxy`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function callProxy(params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${FN_URL}?${qs}`, {
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
    },
  });
  if (!res.ok) throw new Error(`Proxy ${res.status}`);
  return res.json();
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
  const data = await callProxy({ kind: "quote", symbols: symbols.join(",") });
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
  const data = await callProxy({ kind: "chart", symbol, range, interval });
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
    previousClose: result.meta?.chartPreviousClose ?? result.meta?.previousClose,
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
  const data = await callProxy({ kind: "search", q: query });
  return data?.news ?? [];
}

export function formatNumber(n?: number, opts?: Intl.NumberFormatOptions) {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, ...opts }).format(n);
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

// Keep import to ensure the supabase client is initialized in the bundle
void supabase;
