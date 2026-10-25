import { describe, it, expect } from "vitest";
import { parseCnbcRss, pickStories, shortCompanyName } from "./news";
import type { NewsItem } from "./yahoo";

// Trimmed from a real CNBC feed (search.cnbc.com/rs/search/combinedcms/view.xml).
const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:metadata="http://search.cnbc.com/rs/search/view/metadata" version="2.0"><channel>
  <title>Top News &amp; Analysis</title>
  <item>
    <link>https://www.cnbc.com/2026/10/25/nvidia-earnings-preview.html</link>
    <guid isPermaLink="false">108448303</guid>
    <metadata:type>cnbcnewsstory</metadata:type>
    <title>Nvidia earnings are coming: here's what Wall Street expects</title>
    <description><![CDATA[Chipmaker NVDA reports after the bell on Wednesday.]]></description>
    <pubDate>Sun, 25 Oct 2026 12:00:01 GMT</pubDate>
  </item>
  <item>
    <link>https://www.cnbc.com/2026/10/24/ford-recall.html</link>
    <guid isPermaLink="false">108448111</guid>
    <title>Ford (F) recalls 200,000 trucks</title>
    <description><![CDATA[The automaker says a software update fixes the issue.]]></description>
    <pubDate>Sat, 24 Oct 2026 09:30:00 GMT</pubDate>
  </item>
  <item>
    <guid isPermaLink="false">1</guid>
    <title>No link, so skipped</title>
  </item>
</channel></rss>`;

describe("parseCnbcRss", () => {
  it("reads title, link, summary and time, and skips items without a link", () => {
    const items = parseCnbcRss(FEED);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      uuid: "cnbc-108448303",
      title: "Nvidia earnings are coming: here's what Wall Street expects",
      summary: "Chipmaker NVDA reports after the bell on Wednesday.",
      publisher: "CNBC",
      link: "https://www.cnbc.com/2026/10/25/nvidia-earnings-preview.html",
      providerPublishTime: Date.UTC(2026, 9, 25, 12, 0, 1) / 1000,
    });
  });
  it("returns nothing for a broken feed", () => {
    expect(parseCnbcRss("not xml at all")).toEqual([]);
  });
});

const story = (title: string, summary = ""): NewsItem => ({
  uuid: title,
  title,
  summary,
  publisher: "CNBC",
  link: `https://www.cnbc.com/${encodeURIComponent(title)}`,
  providerPublishTime: 0,
  type: "STORY",
});

const STORIES = [
  story("Nvidia earnings are coming", "Chipmaker NVDA reports Wednesday."),
  story("Apple's new iPhone sales beat estimates"),
  story("Ford (F) recalls 200,000 trucks"),
  story("Fed holds rates steady", "F-150 sales and AI spending were both mentioned."),
  story("Google cloud revenue jumps"),
  story("Amazon to hire 250,000 holiday workers"),
];
const titles = (items: NewsItem[]) => items.map((n) => n.title);

describe("pickStories", () => {
  it("market-wide queries get every story", () => {
    expect(pickStories(STORIES, ["S&P 500", "Dow Jones", "Nasdaq", "markets"])).toHaveLength(STORIES.length);
    expect(pickStories(STORIES, ["^GSPC", "SPY"])).toHaveLength(STORIES.length);
    expect(pickStories(STORIES, ["stock market"])).toHaveLength(STORIES.length);
  });
  it("a ticker and company name get only the stories that mention them", () => {
    expect(titles(pickStories(STORIES, ["NVDA", "NVIDIA Corporation"]))).toEqual(["Nvidia earnings are coming"]);
    expect(titles(pickStories(STORIES, ["AAPL", "Apple Inc."]))).toEqual(["Apple's new iPhone sales beat estimates"]);
    expect(titles(pickStories(STORIES, ["AMZN", "Amazon.com, Inc."]))).toEqual(["Amazon to hire 250,000 holiday workers"]);
  });
  it("GOOGL also matches Google", () => {
    expect(titles(pickStories(STORIES, ["GOOGL", "Alphabet Inc."]))).toEqual(["Google cloud revenue jumps"]);
  });
  it("one- and two-letter tickers only count in (F) form, not as ordinary letters", () => {
    expect(titles(pickStories(STORIES, ["F"]))).toEqual(["Ford (F) recalls 200,000 trucks"]);
    expect(pickStories(STORIES, ["AI"])).toEqual([]);
  });
  it("a company with no stories gets none", () => {
    expect(pickStories(STORIES, ["ZZZZ", "Zzyzx Holdings Inc."])).toEqual([]);
  });
});

describe("shortCompanyName", () => {
  it("drops legal suffixes and .com", () => {
    expect(shortCompanyName("NVIDIA Corporation")).toBe("NVIDIA");
    expect(shortCompanyName("Amazon.com, Inc.")).toBe("Amazon");
    expect(shortCompanyName("Meta Platforms, Inc.")).toBe("Meta");
    expect(shortCompanyName("Berkshire Hathaway Inc. Class B")).toBe("Berkshire Hathaway");
    expect(shortCompanyName("Tesla, Inc.")).toBe("Tesla");
  });
});
