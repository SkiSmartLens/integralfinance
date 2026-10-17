import { useEffect, useState } from "react";
import { fetchNews, fetchQuotes, fetchScreener, NewsItem, Quote, ScreenerQuote } from "@/lib/yahoo";

// The Daily Market Brief's data, shared by the /market-brief page and the
// brief card pinned to the top of the watchlists. One cached load serves all
// of them, so opening the full brief from a card doesn't fetch again.

export type MarketMood = "up" | "down" | "mixed";

export const BRIEF_INDICES: { symbol: string; label: string }[] = [
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^IXIC", label: "Nasdaq" },
  { symbol: "^DJI", label: "Dow" },
];

export interface MarketBriefData {
  news: NewsItem[];
  gainers: ScreenerQuote[];
  losers: ScreenerQuote[];
  indices: Quote[];
  mood: MarketMood;
  loadedAt: Date;
}

// Merge multiple news feeds and drop near-duplicate stories (same link, or
// headlines that share most of their significant words).
const STOP = new Set(["the", "a", "an", "of", "to", "in", "on", "for", "and", "as", "is", "are", "at", "by", "with", "from", "after", "amid", "its", "it", "this", "that"]);

function keyWords(title: string): string[] {
  return (title || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function similar(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return false;
  const setB = new Set(b);
  const overlap = a.filter((w) => setB.has(w)).length;
  return overlap / Math.min(a.length, b.length) >= 0.6;
}

export function dedupeNews(items: NewsItem[]): NewsItem[] {
  const out: NewsItem[] = [];
  const seenLinks = new Set<string>();
  const wordSets: string[][] = [];
  for (const item of items) {
    const link = (item.link || "").split("?")[0];
    if (link && seenLinks.has(link)) continue;
    const words = keyWords(item.title);
    if (wordSets.some((w) => similar(words, w))) continue;
    if (link) seenLinks.add(link);
    wordSets.push(words);
    out.push(item);
  }
  return out;
}

/** The day's mood, from the average move of the biggest gainers vs losers. */
export function marketMood(gainers: ScreenerQuote[], losers: ScreenerQuote[]): MarketMood {
  if (!gainers.length && !losers.length) return "mixed";
  const gAvg = gainers.reduce((s, q) => s + (q.regularMarketChangePercent ?? 0), 0) / (gainers.length || 1);
  const lAvg = Math.abs(losers.reduce((s, q) => s + (q.regularMarketChangePercent ?? 0), 0) / (losers.length || 1));
  if (gAvg > lAvg * 1.15) return "up";
  if (lAvg > gAvg * 1.15) return "down";
  return "mixed";
}

export function timeAgo(ts: number) {
  const s = Math.floor(Date.now() / 1000 - ts);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// Yahoo's news search returns nothing for sentence-like phrases ("stock
// market today") but fresh market stories for index names.
const NEWS_QUERIES = ["S&P 500", "Dow Jones", "Nasdaq", "markets"];
const STALE_AFTER_S = 3 * 24 * 3600;

const FRESH_MS = 5 * 60 * 1000;
let cached: { at: number; promise: Promise<MarketBriefData> } | null = null;

/** Every source falls back to empty, so this never rejects. */
export function loadMarketBrief(): Promise<MarketBriefData> {
  if (cached && Date.now() - cached.at < FRESH_MS) return cached.promise;
  const promise = Promise.all([
    fetchNews(NEWS_QUERIES).catch(() => []),
    fetchScreener("day_gainers", 6).catch(() => []),
    fetchScreener("day_losers", 6).catch(() => []),
    fetchQuotes(BRIEF_INDICES.map((i) => i.symbol)).catch(() => []),
  ]).then(([allNews, g, l, indices]) => {
    const gainers = g.slice(0, 5);
    const losers = l.slice(0, 5);
    // Today's brief: drop days-old stories, unless that leaves too few.
    const now = Date.now() / 1000;
    const recent = allNews.filter((n) => now - (n.providerPublishTime ?? 0) < STALE_AFTER_S);
    const data = {
      news: dedupeNews(recent.length >= 6 ? recent : allNews),
      gainers,
      losers,
      indices: indices.filter((q) => !q.error),
      mood: marketMood(gainers, losers),
      loadedAt: new Date(),
    };
    // Don't keep an empty load around; the next view retries.
    if (!data.news.length && !gainers.length && !losers.length) cached = null;
    return data;
  });
  cached = { at: Date.now(), promise };
  return promise;
}

export function useMarketBrief(): MarketBriefData | null {
  const [data, setData] = useState<MarketBriefData | null>(null);
  useEffect(() => {
    let alive = true;
    loadMarketBrief().then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, []);
  return data;
}
