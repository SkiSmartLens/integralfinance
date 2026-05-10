// Yahoo Finance fetch helpers via our own backend edge function (no flaky public proxies).
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://oadtpipsbeqiadoluxnq.supabase.co";
const ANON = ((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hZHRwaXBzYmVxaWFkb2x1eG5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDUyNDYsImV4cCI6MjA5MzU4MTI0Nn0.k7_W04vpl9Sctg1XhNlSz9abWI--VPk82jD5r-0hFvk") as string;
const FN_URL = `${SUPABASE_URL}/functions/v1/yahoo-proxy`;

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
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

export interface ChartResult {
  symbol: string;
  points: ChartPoint[];
  previousClose?: number;
  meta?: any;
}

const finiteNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

export async function fetchChart(
  symbol: string,
  range: string,
  interval: string
): Promise<ChartResult> {
  const data = await callProxy({ kind: "chart", symbol, range, interval });
  const result = data?.chart?.result?.[0];
  if (!result) return { symbol, points: [] };
  const ts: number[] = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};
  const closes: (number | null)[] = q.close ?? [];
  const opens: (number | null)[] = q.open ?? [];
  const highs: (number | null)[] = q.high ?? [];
  const lows: (number | null)[] = q.low ?? [];
  const vols: (number | null)[] = q.volume ?? [];
  const points: ChartPoint[] = ts.flatMap((t, i) => {
      const close = finiteNumber(closes[i]);
      if (close == null) return [];
      const open = finiteNumber(opens[i]);
      const high = finiteNumber(highs[i]);
      const low = finiteNumber(lows[i]);
      const volume = finiteNumber(vols[i]);
      return {
        t: t * 1000,
        price: close,
        ...(open != null ? { open } : {}),
        ...(high != null ? { high } : {}),
        ...(low != null ? { low } : {}),
        close,
        ...(volume != null ? { volume } : {}),
      };
    });
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

export interface ScreenerQuote {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  averageDailyVolume3Month?: number;
  trailingPE?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  exchange?: string;
}

export async function fetchScreener(scrId: string, count = 25): Promise<ScreenerQuote[]> {
  const data = await callProxy({ kind: "screener", scrId, count: String(count) });
  return data?.finance?.result?.[0]?.quotes ?? [];
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
