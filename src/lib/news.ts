import type { NewsItem } from "@/lib/yahoo";

// News comes from CNBC's public RSS feeds, read straight from the browser
// (they allow any origin). Yahoo Finance's own story pages can't be read by
// the jargon translator from the server, so its "AI Summarize" failed on
// them with a 422; CNBC's articles read in a few seconds.

// Finance sections only; CNBC's Top News feed also carries politics and world news.
const CNBC_FEEDS = [
  15839069, // Investing
  20409666, // Market Insider
  15839135, // Earnings
  20910258, // Economy
  10000664, // Finance
  19854910, // Technology
  10001147, // Business
].map((id) => `https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=${id}`);

/** Parse one RSS feed into news items. Items without a link or title are skipped. */
export function parseCnbcRss(xml: string): NewsItem[] {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const out: NewsItem[] = [];
  for (const item of Array.from(doc.getElementsByTagName("item"))) {
    const text = (tag: string) => item.getElementsByTagName(tag)[0]?.textContent?.trim() ?? "";
    const link = text("link");
    const title = text("title");
    if (!link || !title) continue;
    const published = Date.parse(text("pubDate"));
    out.push({
      uuid: `cnbc-${text("guid") || link}`,
      title,
      summary: text("description"),
      publisher: "CNBC",
      link,
      providerPublishTime: Number.isFinite(published) ? Math.floor(published / 1000) : 0,
      type: "STORY",
    });
  }
  return out;
}

const TTL_MS = 3 * 60 * 1000;
let cache: { at: number; promise: Promise<NewsItem[]> } | null = null;

/** Every CNBC feed merged, newest first. Cached for a few minutes and shared by every news list. */
export function fetchCnbcNews(): Promise<NewsItem[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.promise;
  const promise = Promise.all(
    CNBC_FEEDS.map((u) =>
      fetch(u)
        .then((r) => (r.ok ? r.text() : ""))
        .then(parseCnbcRss)
        .catch(() => [] as NewsItem[]),
    ),
  ).then((feeds) => {
    const byLink = new Map<string, NewsItem>();
    for (const item of feeds.flat()) if (!byLink.has(item.link)) byLink.set(item.link, item);
    const all = [...byLink.values()].sort((a, b) => b.providerPublishTime - a.providerPublishTime);
    if (!all.length) cache = null; // don't keep a failed load
    return all;
  });
  cache = { at: Date.now(), promise };
  return promise;
}

/** Queries that mean "the market in general" rather than one company. */
const MARKET_QUERY = /^\^|^(SPY|QQQ|DIA|VOO|VTI)$|s&p 500|dow jones|nasdaq|^markets?$|stock market/i;

export const isMarketQuery = (q: string) => MARKET_QUERY.test(q.trim());

// Names stories use that differ from the listed company name.
const ALIASES: Record<string, string[]> = {
  GOOG: ["Google"],
  GOOGL: ["Google"],
  META: ["Facebook", "Instagram"],
  "BRK-B": ["Berkshire"],
  "BRK-A": ["Berkshire"],
};

const COMPANY_SUFFIX =
  /(,?\s+(inc\.?|incorporated|corp\.?|corporation|co\.?|company|holdings?|group|ltd\.?|limited|plc|n\.v\.|s\.a\.|ag|se|platforms|technologies|class [a-c]|common stock))+$/i;

/** "Amazon.com, Inc." → "Amazon", "NVIDIA Corporation" → "NVIDIA". */
export function shortCompanyName(name: string): string {
  let n = name.trim().replace(/\.com\b/i, "");
  for (let prev = ""; prev !== n; ) {
    prev = n;
    n = n.replace(COMPANY_SUFFIX, "").replace(/[,.\s]+$/, "");
  }
  return n;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Patterns that find one query (a ticker or a company name) in a headline or summary. */
function patternsFor(q: string): RegExp[] {
  const t = q.trim();
  if (!t) return [];
  if (/^[A-Z][A-Z.-]{0,5}$/.test(t)) {
    // Tickers are matched in capitals. One- and two-letter ones ("F", "AI") are
    // ordinary words too, so they only count in "(F)" or "NYSE: F" form.
    const tick = escape(t);
    const pats =
      t.length <= 2
        ? [new RegExp(`\\(${tick}\\)|(NYSE|NASDAQ|ticker):\\s*${tick}\\b`)]
        : [new RegExp(`(^|[^A-Za-z])${tick}([^A-Za-z]|$)`)];
    for (const a of ALIASES[t] ?? []) pats.push(new RegExp(`\\b${escape(a)}\\b`, "i"));
    return pats;
  }
  const name = shortCompanyName(t);
  return name.length >= 3 ? [new RegExp(`\\b${escape(name)}\\b`, "i")] : [];
}

/**
 * The stories for a set of queries: everything for market-wide queries,
 * otherwise only stories whose headline or summary mentions one of them.
 */
export function pickStories(items: NewsItem[], queries: string[]): NewsItem[] {
  const qs = queries.map((q) => q.trim()).filter(Boolean);
  if (!qs.length) return [];
  if (qs.every(isMarketQuery)) return items;
  const pats = qs.filter((q) => !isMarketQuery(q)).flatMap(patternsFor);
  return items.filter((n) => pats.some((p) => p.test(n.title) || p.test(n.summary ?? "")));
}
