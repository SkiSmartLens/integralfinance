import { afterEach, describe, it, expect, vi } from "vitest";
import { fetchNews, type NewsItem } from "./yahoo";

const now = Math.floor(Date.now() / 1000);

// The general feeds (CNBC and the rest) only have a story about Google.
const FEED = `<rss version="2.0"><channel><item>
  <link>https://www.cnbc.com/google-cloud.html</link>
  <title>Google cloud revenue jumps</title>
  <pubDate>${new Date().toUTCString()}</pubDate>
</item></channel></rss>`;

const yahoo = (title: string, relatedTickers: string[], hoursAgo = 30): NewsItem => ({
  uuid: title,
  title,
  publisher: "MT Newswires",
  link: `https://finance.yahoo.com/${encodeURIComponent(title)}.html`,
  providerPublishTime: now - hoursAgo * 3600,
  type: "STORY",
  relatedTickers,
});

const DYNE = [
  yahoo("Oppenheimer Downgrades Dyne Therapeutics to Perform", ["DYN"]),
  yahoo("Novartis shares fall as del-desiran flunks Phase 3 trial", ["NVS", "SRPT", "DYN", "NVS"]),
  yahoo("Uber initiated, Thermo Fisher upgraded: Wall Street's top analyst calls", ["TMO", "UBER", "FIGR", "MLM", "DYN", "META"]),
  yahoo("Google cloud revenue jumps", ["GOOGL"]),
];

/** The site's requests: general feeds, and the proxy with or without kind=stocknews. */
const stubFetch = (hasStockNews: boolean) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const u = new URL(url);
      if (!u.pathname.includes("yahoo-proxy")) return new Response(FEED);
      const kind = u.searchParams.get("kind");
      if (kind === "rss") return new Response("");
      if (kind === "stocknews") {
        return hasStockNews ? new Response(JSON.stringify({ news: DYNE.slice(0, 2) })) : new Response('{"error":"invalid kind"}', { status: 400 });
      }
      if (kind === "search") return new Response(JSON.stringify({ news: DYNE }));
      return new Response("{}", { status: 404 });
    }),
  );

afterEach(() => vi.unstubAllGlobals());

describe("fetchNews for a stock", () => {
  it("is the company's own stories, not the general feeds' other news", async () => {
    stubFetch(true);
    const titles = (await fetchNews(["DYN", "Dyne Therapeutics, Inc."])).map((n) => n.title);
    expect(titles).toEqual(["Oppenheimer Downgrades Dyne Therapeutics to Perform", "Novartis shares fall as del-desiran flunks Phase 3 trial"]);
  });

  it("before the proxy has kind=stocknews, uses its news search without roundups or other tickers", async () => {
    stubFetch(false);
    const titles = (await fetchNews(["DYN", "Dyne Therapeutics Inc"])).map((n) => n.title);
    expect(titles).toEqual(["Oppenheimer Downgrades Dyne Therapeutics to Perform", "Novartis shares fall as del-desiran flunks Phase 3 trial"]);
  });

  it("market-wide news is still every feed story", async () => {
    stubFetch(true);
    expect((await fetchNews(["S&P 500", "markets"])).map((n) => n.title)).toEqual(["Google cloud revenue jumps"]);
  });
});
