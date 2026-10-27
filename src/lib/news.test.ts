import { describe, it, expect } from "vitest";
import { companyNames, mixPublishers, parseRss, pickStories, shortCompanyName } from "./news";
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

describe("parseRss", () => {
  it("reads title, link, summary and time, and skips items without a link", () => {
    const items = parseRss(FEED, "CNBC");
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      uuid: "CNBC-108448303",
      title: "Nvidia earnings are coming: here's what Wall Street expects",
      summary: "Chipmaker NVDA reports after the bell on Wednesday.",
      publisher: "CNBC",
      link: "https://www.cnbc.com/2026/10/25/nvidia-earnings-preview.html",
      providerPublishTime: Date.UTC(2026, 9, 25, 12, 0, 1) / 1000,
    });
  });
  it("drops the 'The post ... appeared first on' line WordPress feeds add", () => {
    const xml = `<rss version="2.0"><channel><item>
      <link>https://www.investors.com/news/nvidia-meta/</link>
      <title>Nvidia, AMD Get Their Jollies Hooking Up With Meta's Muse</title>
      <description><![CDATA[<p>Nvidia and AMD announced deals with Meta.</p>
<p>The post <a href="https://www.investors.com/news/nvidia-meta/">Nvidia, AMD Get Their Jollies</a> appeared first on <a href="https://www.investors.com">Investor's Business Daily</a>.</p>]]></description>
    </item></channel></rss>`;
    expect(parseRss(xml, "Investor's Business Daily")[0].summary).toBe("Nvidia and AMD announced deals with Meta.");
  });
  it("returns nothing for a broken feed", () => {
    expect(parseRss("not xml at all", "CNBC")).toEqual([]);
  });
  it("keeps the full article and the picture when the feed has them", () => {
    const body = "<p>GM said Tuesday it will move its listing.</p><p>" + "Shares rose. ".repeat(40) + "</p>";
    const xml = `<rss xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/" version="2.0"><channel>
      <item>
        <link>https://www.foxbusiness.com/markets/gm-nasdaq</link>
        <title>GM to move listing to Nasdaq</title>
        <description>GM will move its shares from the NYSE.</description>
        <content:encoded><![CDATA[${body}]]></content:encoded>
        <media:content url="https://a57.foxnews.com/gm.jpg" medium="image" />
        <pubDate>Tue, 27 Oct 2026 09:26:44 -0400</pubDate>
      </item>
      <item>
        <link>https://www.bbc.co.uk/news/articles/x</link>
        <title>Short one</title>
        <content:encoded><![CDATA[<p>Too short to use.</p>]]></content:encoded>
        <media:thumbnail url="https://ichef.bbci.co.uk/x.jpg" width="240" height="135" />
      </item>
    </channel></rss>`;
    const [fox, bbc] = parseRss(xml, "Fox Business");
    expect(fox.content).toMatch(/^GM said Tuesday it will move its listing\.\n\nShares rose\./);
    expect(fox.thumbnail?.resolutions[0].url).toBe("https://a57.foxnews.com/gm.jpg");
    expect(bbc.content).toBeUndefined();
    expect(bbc.thumbnail?.resolutions[0].url).toBe("https://ichef.bbci.co.uk/x.jpg");
  });
});

describe("mixPublishers", () => {
  const at = (publisher: string, t: number): NewsItem => ({
    uuid: `${publisher}${t}`, title: `${publisher} ${t}`, publisher, link: `https://x/${publisher}${t}`, providerPublishTime: t, type: "STORY",
  });
  it("pushes an outlet's next story back for each one already picked", () => {
    const items = [at("CNBC", 9), at("CNBC", 8), at("CNBC", 7), at("BBC", 6), at("CNBC", 5), at("NPR", 4)];
    expect(mixPublishers(items, 3).map((n) => n.title)).toEqual(["CNBC 9", "BBC 6", "CNBC 8", "NPR 4", "CNBC 7", "CNBC 5"]);
  });
  it("gets a 3-hour-old story from another outlet into the top three past a minute-by-minute feed", () => {
    const cnbc = Array.from({ length: 20 }, (_, i) => at("CNBC", 100_000 - 60 * i));
    const items = [...cnbc, at("Fox Business", 100_000 - 3 * 3600)];
    expect(mixPublishers(items).findIndex((n) => n.publisher === "Fox Business")).toBe(2);
  });
  it("keeps time order within one outlet", () => {
    const items = [at("CNBC", 8), at("CNBC", 9)];
    expect(mixPublishers(items).map((n) => n.title)).toEqual(["CNBC 9", "CNBC 8"]);
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

describe("companyNames", () => {
  it("adds a distinctive first word, since stories say Ford and JPMorgan", () => {
    expect(companyNames("Ford Motor Company")).toEqual(["Ford Motor", "Ford"]);
    expect(companyNames("JPMorgan Chase & Co.")).toEqual(["JPMorgan Chase", "JPMorgan"]);
    expect(companyNames("NVIDIA Corporation")).toEqual(["NVIDIA"]);
  });
  it("skips first words that would match other companies", () => {
    expect(companyNames("General Motors Company")).toEqual(["General Motors"]);
    expect(companyNames("American Express Company")).toEqual(["American Express"]);
  });
});
