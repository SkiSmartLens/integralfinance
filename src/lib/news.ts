import type { NewsItem } from "@/lib/yahoo";

// News comes from publishers' public RSS feeds. Every publisher here was
// checked against the jargon translator ("AI Summarize"): it can open their
// articles from the server. Yahoo Finance, Forbes, Nasdaq.com, the NYT, WSJ
// and Seeking Alpha can't be opened that way, so they aren't used.

interface Feed {
  publisher: string;
  url: string;
}

const cnbc = (id: number): Feed => ({
  publisher: "CNBC",
  url: `https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=${id}`,
});

// These allow any origin, so the browser reads them directly. CNBC: finance
// sections only; its Top News feed also carries politics and world news.
const DIRECT_FEEDS: Feed[] = [
  cnbc(15839069), // Investing
  cnbc(20409666), // Market Insider
  cnbc(15839135), // Earnings
  cnbc(20910258), // Economy
  cnbc(10000664), // Finance
  cnbc(19854910), // Technology
  cnbc(10001147), // Business
  { publisher: "Fox Business", url: "https://moxie.foxbusiness.com/google-publisher/markets.xml" },
  { publisher: "Fox Business", url: "https://moxie.foxbusiness.com/google-publisher/economy.xml" },
];

// These don't allow other sites to read them, so they come through our
// yahoo-proxy function (kind=rss&feed=<id>), which only fetches this fixed
// list. Until that function is deployed with it, these come back empty.
const PROXIED_FEEDS: { publisher: string; id: string }[] = [
  { publisher: "Investor's Business Daily", id: "ibd" },
  { publisher: "The Guardian", id: "guardian" },
  { publisher: "BBC News", id: "bbc" },
  { publisher: "CBS News", id: "cbs" },
  { publisher: "ABC News", id: "abc" },
  { publisher: "NPR", id: "npr_business" },
  { publisher: "NPR", id: "npr_economy" },
  { publisher: "Fortune", id: "fortune" },
];

/** An article's HTML as plain paragraphs. */
function htmlToText(html: string): string {
  const marked = html.replace(/<\/(p|h[1-6]|li|blockquote)>/gi, "\n\n").replace(/<br\s*\/?>/gi, "\n");
  const text = new DOMParser().parseFromString(marked, "text/html").body.textContent ?? "";
  return text
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l, i, all) => l || (i > 0 && all[i - 1]))
    .join("\n")
    .trim();
}

/** The first image URL an item offers (media:content, media:thumbnail or an image enclosure). */
function imageOf(item: Element): string | undefined {
  for (const tag of ["media:content", "media:thumbnail", "enclosure"]) {
    for (const el of Array.from(item.getElementsByTagName(tag))) {
      const url = el.getAttribute("url");
      const type = el.getAttribute("type") ?? el.getAttribute("medium") ?? "image";
      if (url && /^https:\/\//.test(url) && /image/i.test(type)) return url;
    }
  }
  return undefined;
}

/**
 * Parse one RSS feed into news items. Items without a link or title are
 * skipped. `content` is the full article when the feed carries it
 * (content:encoded), so "AI Summarize" can work without opening the page.
 */
export function parseRss(xml: string, publisher: string): NewsItem[] {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const out: NewsItem[] = [];
  for (const item of Array.from(doc.getElementsByTagName("item"))) {
    const text = (tag: string) => item.getElementsByTagName(tag)[0]?.textContent?.trim() ?? "";
    const link = text("link");
    const title = htmlToText(text("title"));
    if (!link || !title) continue;
    const published = Date.parse(text("pubDate"));
    const content = htmlToText(text("content:encoded"));
    const img = imageOf(item);
    out.push({
      uuid: `${publisher}-${text("guid") || link}`,
      title,
      summary: htmlToText(text("description")),
      ...(content.length >= 400 ? { content } : {}),
      publisher,
      link,
      providerPublishTime: Number.isFinite(published) ? Math.floor(published / 1000) : 0,
      type: "STORY",
      ...(img ? { thumbnail: { resolutions: [{ url: img, width: 0, height: 0 }] } } : {}),
    });
  }
  return out;
}

const getText = (url: string) => fetch(url).then((r) => (r.ok ? r.text() : ""));

/**
 * Newest first, but each story already picked from an outlet counts that
 * outlet's next one as `penaltySec` older, so one outlet that publishes every
 * few minutes (CNBC) can't fill the top of the list.
 */
export function mixPublishers(items: NewsItem[], penaltySec = 2 * 60 * 60): NewsItem[] {
  const queues = new Map<string, NewsItem[]>();
  for (const n of [...items].sort((a, b) => b.providerPublishTime - a.providerPublishTime)) {
    const q = queues.get(n.publisher) ?? [];
    q.push(n);
    queues.set(n.publisher, q);
  }
  const taken = new Map<string, number>();
  const out: NewsItem[] = [];
  while (out.length < items.length) {
    let best = "";
    let bestScore = -Infinity;
    for (const [publisher, q] of queues) {
      if (!q.length) continue;
      const score = q[0].providerPublishTime - (taken.get(publisher) ?? 0) * penaltySec;
      if (score > bestScore) {
        bestScore = score;
        best = publisher;
      }
    }
    out.push(queues.get(best)!.shift()!);
    taken.set(best, (taken.get(best) ?? 0) + 1);
  }
  return out;
}

const TTL_MS = 3 * 60 * 1000;
let cache: { at: number; promise: Promise<NewsItem[]> } | null = null;

/**
 * Every feed merged, newest first with outlets mixed. Cached for a few minutes
 * and shared by every news list. `proxyFeed` fetches one PROXIED_FEEDS id.
 */
export function fetchFeedNews(proxyFeed: (id: string) => Promise<string>): Promise<NewsItem[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.promise;
  const direct = DIRECT_FEEDS.map((f) => getText(f.url).then((x) => parseRss(x, f.publisher)));
  const proxied = PROXIED_FEEDS.map((f) => proxyFeed(f.id).then((x) => parseRss(x, f.publisher)));
  const promise = Promise.all([...direct, ...proxied].map((p) => p.catch(() => [] as NewsItem[]))).then((feeds) => {
    const seen = new Set<string>();
    const all = feeds
      .flat()
      .filter((n) => {
        // The same wire story can come from several feeds or outlets.
        const keys = [n.link.replace(/[?#].*$/, ""), n.title.toLowerCase()];
        if (keys.some((k) => seen.has(k))) return false;
        keys.forEach((k) => seen.add(k));
        return true;
      })
      .sort((a, b) => b.providerPublishTime - a.providerPublishTime);
    if (!all.length) cache = null; // don't keep a failed load
    return mixPublishers(all);
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
