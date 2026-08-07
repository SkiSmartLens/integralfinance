// Blog posts for IntegralStocks. Add new entries here — they're picked up
// automatically by /blog and /blog/:slug, by the sitemap generator, and by the
// "Related articles" section on stock pages that share a ticker or sector tag.
//
// Editorial rules for this file:
// - Every post is a full article (700+ words) with worked numbers, a case
//   study, and the mistakes beginners actually make on that topic.
// - No two posts should share the same skeleton. Vary the structure.
// - Retired/merged slugs live in REDIRECTS below so old links never 404.

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // ISO date
  readMinutes: number;
  tickers?: string[]; // uppercase symbols mentioned
  sectors?: string[];
  tags?: string[];
  category?: string;
  /** Specific alt text for this post's featured image. */
  imageAlt?: string;
  /**
   * Simple markdown-ish body. Supported blocks:
   * `##` h2, `###` h3, `- ` bullet list, `1. ` numbered list,
   * `| a | b |` tables, and blank-line-separated paragraphs.
   * Inline: **bold** and [text](url).
   */
  body: string;
}

/**
 * Slugs of posts that were merged into a deeper article. Old URLs redirect to
 * the surviving post instead of 404-ing.
 */
export const REDIRECTS: Record<string, string> = {
  "pe-ratio-explained": "what-does-pe-ratio-mean",
  "how-to-read-stock-chart": "how-to-read-a-stock-chart-for-beginners",
  "how-to-choose-your-first-stock": "how-to-pick-your-first-stock",
  "paper-trading-benefits": "paper-trading-vs-real-trading",
  "stock-market-terms-explained-simply": "how-to-start-investing-with-100-dollars",
  "how-to-invest-in-stocks-with-no-experience": "how-to-start-investing-with-100-dollars",
  "best-stock-simulator-for-beginners": "paper-trading-vs-real-trading",
  "what-is-a-stock-ticker": "how-to-read-a-stock-chart-for-beginners",
  "how-much-money-do-i-need-to-start-investing": "how-to-start-investing-with-100-dollars",
  "fractional-shares": "how-to-start-investing-with-100-dollars",
  "budgeting-before-investing": "how-to-start-investing-with-100-dollars",
  "emergency-fund-before-investing": "how-to-start-investing-with-100-dollars",
  "high-yield-savings-vs-stocks": "stocks-vs-etfs",
  "what-is-diversification": "stocks-vs-etfs",
  "dollar-cost-averaging": "compound-growth",
  "how-stock-market-works": "what-moves-stock-prices",
  "bull-vs-bear-markets": "what-moves-stock-prices",
  "market-corrections": "investing-psychology",
  "news-headlines-and-investing": "what-moves-stock-prices",
  "support-and-resistance": "how-to-read-a-stock-chart-for-beginners",
  "stop-loss-orders": "beginner-investor-mistakes",
  "leverage-and-shorting": "beginner-investor-mistakes",
  "revenue-vs-profit": "how-to-read-earnings-report",
  "what-makes-great-business": "how-to-pick-your-first-stock",
  "teen-investing": "why-i-built-integralstocks",
};

export const POSTS: BlogPost[] = [
  {
    slug: "how-to-start-investing-with-100-dollars",
    title: "How to Start Investing With $100 (A Beginner's Guide)",
    description:
      "A step-by-step walkthrough of putting your first $100 into the market: what it actually buys, the fees that eat it, a worked example with real numbers, and the four mistakes that ruin most first trades.",
    publishedAt: "2026-07-01",
    readMinutes: 9,
    tickers: ["VOO", "VTI", "SPY", "AAPL"],
    tags: ["beginner", "getting-started", "money-basics"],
    category: "Beginner Basics",
    imageAlt:
      "A single gold coin dropping into a rising green bar chart, illustrating a first $100 investment growing over time",
    body: `
I placed my first real order for $104.18 of an S&P 500 fund, and I refreshed the page eleven times in the first hour. Nothing happened. It closed the day up 31 cents. That anticlimax is the most useful thing that has ever happened to my investing, and it is the whole reason I tell beginners to start small instead of waiting until they have "enough."

$100 is not a serious amount of money in the market. It is a serious amount of education. Here is exactly what to do with it.

## What $100 actually buys in 2026

Before fractional shares existed, $100 was genuinely limiting — if a share cost $430, you could not own it. That is over. Every mainstream U.S. broker now sells fractional shares, usually down to $1, so the question is no longer "what can I afford" but "what do I want exposure to."

| What you buy with $100 | What you own | What a 10% market move does |
| --- | --- | --- |
| Broad-market ETF ([VOO](/stocks/voo), [VTI](/stocks/vti)) | A sliver of 500–4,000 companies | About ±$10, tracking the whole market |
| One large company ([AAPL](/stocks/aapl)) | ~0.4 of a share | Could be ±$25 on a bad earnings day |
| Five random "cheap" stocks at $20 each | Five tiny, volatile positions | Anything from −$40 to +$60 |

The third row is what most beginners do, and it is the worst of the three. Spreading $100 across five speculative names does not diversify you — it just gives you five things to panic about.

## The five-step version

1. **Open a brokerage account, not an app with a leaderboard.** Fidelity, Schwab, Robinhood, and Public are all fine. Opening costs nothing. Budget 10 minutes and your Social Security number.
2. **Move the money and let it settle.** Transfers take 1–3 business days. Do not treat the settling period as a reason to change your plan four times.
3. **Decide the split before you look at prices.** My suggestion for a first $100: $75 into a broad-market ETF, $25 into one company whose product you personally use. The ETF teaches you what "the market" does. The single stock teaches you what company-specific risk feels like.
4. **Place a market order during regular hours** (9:30am–4:00pm ET). Pre-market and after-hours have wide spreads, which means you quietly pay more.
5. **Write down why you bought it.** One sentence in your notes app. In three months this note will be worth more than the position.

## A worked example with real numbers

Say you put $75 into an S&P 500 ETF trading at $512 and $25 into a $210 stock.

- ETF: 0.1465 shares. If the index gains 8% over a year, that is $75 → $81. Six dollars.
- Stock: 0.119 shares. If it rallies 30%, that is $25 → $32.50. Seven dollars fifty.

Total: about $13.50 in a good year. That is the honest math, and it is why the first $100 is not about the return. Meanwhile, that same $100 gets you twelve months of watching how earnings days, rate decisions, and headlines move a position you actually own. Nobody learns that from reading.

## A short case study: two beginners, same $100

Two people I helped last spring both started with $100 in March.

The first bought a broad ETF and did nothing. By June she was up about 4%, roughly four dollars. Boring. But she had read four earnings summaries and could explain what a market cap was, because she had a reason to care.

The second bought a stock that had already run 40% in a month because it was "the one everyone's talking about." It dropped 18% in two weeks. He sold at −$18, told himself the market was rigged, and did not place another trade for five months. The $18 was not the loss. The five months were.

The difference was not skill. It was position selection and the decision to hold through the first red week.

## Practice the bigger version before you fund it

Here is what I would genuinely do in your position: make the $100 real trade, and simultaneously run the trade you *wish* you could make in the [simulator](/simulator) with the $100,000 virtual balance. Same live prices, no risk. Buy $10,000 of the same ETF, put $2,000 into three companies, and watch a real portfolio move at a scale where the dollar swings are large enough to feel.

When you place a trade there, the post-trade card explains in plain English why that stock moved that day, which is the part a brokerage will never give you. If you are competing with friends, the [leaderboard](/simulator) turns it into something you actually come back to. Add every company you are curious about to your [watchlist](/watchlist) so you are tracking ten names instead of obsessing over one.

## Four mistakes that ruin first $100s

- **Buying a sub-$5 stock because the number is small.** Price per share tells you nothing about value. A $3 stock is not cheaper than a $300 stock; it just has more shares outstanding.
- **Chasing something that already moved.** If a name is up 40% this month and it is in your feed, you are late to a story other people started.
- **Selling on the first red day.** A 5% drawdown on $100 is five dollars. If that triggers a sell, the position size was not the problem — the plan was.
- **Adding a second $100 before you understand the first.** Give it 30 days. Then add.

## What to do 30 days from now

Open your position, look at the percentage, and ask yourself one question: do you know why it moved? If yes, add another $100 and repeat. If no, that is not a reason to quit — it is the exact gap the [Market Brief](/market-brief) and the [Learn hub](/learn) exist to close. Start there, then add the money.
`,
  },
  {
    slug: "how-to-read-a-stock-chart-for-beginners",
    title: "How to Read a Stock Chart (for Complete Beginners)",
    description:
      "A chart is answering three questions at once. Learn to read price, time, and volume together, work through a real 5% move line by line, and spot support and resistance without kidding yourself.",
    publishedAt: "2026-07-05",
    readMinutes: 10,
    tickers: ["AAPL", "MSFT", "NVDA", "SPY"],
    tags: ["charts", "beginner", "technical-analysis"],
    category: "Technical Analysis",
    imageAlt:
      "A green and red candlestick chart with a rising trendline and volume bars beneath it, labelled for a beginner reading price action",
    body: `
The first time I opened a candlestick chart I closed it in about four seconds. It looked like a heart monitor attached to something in distress. What finally made charts click for me was realizing a chart is not a prediction machine. It is a record of an argument between buyers and sellers, and it is only ever answering three questions.

1. What is the price now, and what path did it take to get here?
2. Is this move big or small **for this particular stock**?
3. How many people were involved in the move?

Everything else — patterns, indicators, trendlines — is a variation on those three. Let's read a chart properly.

## The axes, and the one setting beginners get wrong

The vertical axis is price per share. The horizontal axis is time. The setting that quietly misleads people is the **range selector**.

Pull up [AAPL](/stocks/aapl) and flip between 1D, 1M, and 1Y. Same company, three different stories: a stock can be down 1.2% today, up 6% on the month, and down 14% on the year, all at once. All three are true. If you only ever look at one range, you are not analyzing — you are being framed by a default setting.

The second setting is **linear vs log scale**. On a log chart, $10 → $20 takes the same vertical space as $100 → $200, because both are +100%. For long-term charts log is more honest; for your first year, leave it linear and just be aware the option exists.

## Reading a candle in ten seconds

Each candle covers one slice of time. It shows four numbers:

- **Open** — price at the start of the period
- **Close** — price at the end
- **High / low** — the extremes, drawn as the thin wick

Green (or hollow) means the close was above the open. Red means below. The **body** is the argument that was settled; the **wick** is the argument that was rejected. A candle with a long lower wick means sellers pushed the price down hard and buyers pushed it all the way back — that is a genuinely different event from a small red candle, even if both end the day down.

If candles feel like too much on day one, switch the chart to the mountain view. You lose the open/high/low detail but the trend is easier to see, and trend is what matters first.

## Volume: the part beginners ignore and professionals check first

Volume is the bar chart underneath. It counts shares traded.

Here is the rule that took me a year to internalize: **a price move without volume is a rumor; a price move with volume is a decision.**

Worked example. A stock trades an average of 4 million shares a day and closes up 5%:

- If that day's volume was 3.1 million — below average — the move was thin. A handful of buyers pushed a quiet tape. It very often gives the move back.
- If volume was 19 million — nearly 5× normal — something happened. Earnings, an upgrade, a product announcement, index inclusion. Institutions moved size.

Same 5% on the chart. Completely different meaning. When I see a big move now, I look at the volume bar before I read a single headline.

## Working through a real move, line by line

Say you open [NVDA](/stocks/nvda) and see this on the daily chart:

| What you see | What it tells you |
| --- | --- |
| Price gapped up from $178 to $191 at the open | Something happened outside market hours — news, earnings, or guidance |
| Volume bar is 3× the neighbouring bars | Real participation, not drift |
| The candle has a long upper wick, closing at $184 | Buyers pushed to $193 and got sold into; the enthusiasm faded intraday |
| The next two candles are small and red on low volume | Digestion, not reversal — few people are trading it |

Reading that in sequence gives you an actual narrative: good news, strong initial buying, profit-taking into the strength, then a quiet pause. You did not need a single indicator.

Then you do the part most chart tutorials leave out: you go find out **what the news was.** Open the stock page and read the plain-English explanation of the move, or check the [Market Brief](/market-brief) for that day. A chart tells you that something happened and how much conviction was behind it. It never tells you what.

## Support and resistance, without the mysticism

**Support** is a price area where buyers have repeatedly shown up. **Resistance** is where sellers have. They exist because they are where people made decisions — a stock that stalled three times at $250 has a lot of holders who bought at $250 and want to get out even.

Two honest caveats:

- They are zones, not lines. $248–$252, not exactly $250.
- The more times a level is tested, the weaker it usually becomes, not stronger. Each test consumes the orders sitting there.

Draw them with a flat horizontal line on a weekly chart, using closing prices rather than wicks. If you need seven trendlines to see a pattern, the pattern is not there.

## The five mistakes I see constantly

- **Reading a 1D chart as if it were a company's story.** Today's 2% move is noise on the scale of your holding period.
- **Ignoring volume entirely.** It is the confirmation layer for everything else.
- **Confusing a low share price with a cheap company.** A $6 stock is not on sale.
- **Finding patterns after the fact.** Everything looks like a head-and-shoulders once you know the outcome. Mark your level *before* the move, not after.
- **Trading a chart with no idea what the company does.** A chart is one input. [Picking a first stock](/blog/how-to-pick-your-first-stock) covers the other half.

## Practice, cheaply

Pick three names — one index ETF like [SPY](/stocks/spy), one steady large-cap like [MSFT](/stocks/msft), one volatile one like [NVDA](/stocks/nvda) — and add them to your [watchlist](/watchlist). Every day for two weeks, look at each chart for 60 seconds and write one sentence: what happened, and was volume above or below average. Fourteen days of that will teach you more than any pattern list.

When you are ready to act on a read, do it in the [simulator](/simulator) first, where being wrong costs a leaderboard place instead of rent. More structured chart work is in the [Learn hub](/learn/reading).
`,
  },
  {
    slug: "what-does-pe-ratio-mean",
    title: "What Does P/E Ratio Mean? (Explained With Real Math)",
    description:
      "The most quoted number in investing, worked out with actual arithmetic — trailing vs forward, why a P/E of 8 can be a trap and 45 can be reasonable, and the three comparisons that make it useful.",
    publishedAt: "2026-07-08",
    readMinutes: 9,
    tickers: ["AAPL", "TSLA", "GOOG", "KO"],
    tags: ["fundamentals", "valuation", "beginner", "stock-research"],
    category: "Stock Research",
    imageAlt:
      "A magnifying glass over a company earnings report showing a price-to-earnings calculation and comparison bars",
    body: `
## Start with the arithmetic, because it is genuinely simple

**P/E ratio = share price ÷ earnings per share.**

That is it. If a company's stock trades at $200 and it earned $8 per share over the last year, the P/E is 25. The plain-English translation: you are paying $25 today for every $1 of annual profit the company currently produces.

Flip it and it gets more intuitive. 1 ÷ 25 = 4%. That is the **earnings yield** — the profit the business generates each year as a percentage of what you paid. Suddenly you can compare it to a savings account or a bond, which is exactly what professional investors are doing when they mutter about rates.

## Why share price alone tells you nothing

This is the misconception the P/E exists to kill. Two companies, both trading at exactly $50:

| | Company A | Company B |
| --- | --- | --- |
| Share price | $50 | $50 |
| Earnings per share | $10.00 | $0.50 |
| P/E | 5 | 100 |
| Earnings yield | 20% | 1% |
| You are paying | $5 per $1 of profit | $100 per $1 of profit |

Identical price tags, twentyfold difference in what you get. Anyone who tells you a stock is "cheap" because the share price is low, without mentioning earnings, is telling you nothing at all.

## Trailing vs forward, and why the gap matters

- **Trailing P/E (TTM)** uses the last twelve months of actual, reported earnings. It is a fact.
- **Forward P/E** uses analysts' estimates for the next twelve months. It is an opinion with a spreadsheet attached.

The gap between them is information. If a stock trades at a trailing P/E of 60 and a forward P/E of 28, the market expects earnings to roughly double. Your job as an investor is to decide whether that expectation is plausible — not to congratulate yourself for finding the lower number.

Analysts are also systematically optimistic. Treat forward P/E as the bull case, not the base case.

## When a low P/E is a trap

I lost money on this exact mistake in a simulator, which is the cheapest place to lose it. I bought a name at a P/E of 7 because everything else in the market looked expensive, and I was proud of myself for about six weeks. The stock kept sliding. The P/E was 7 because the market had already concluded next year's earnings would be far lower — the denominator was about to collapse, and the price was simply there first.

The technical name is a **value trap**. The pattern shows up in three places:

- **Cyclical businesses** — automakers, oil, shipping, homebuilders. Their P/E is *lowest* at the peak of the cycle, when earnings are at a record, and *highest* at the bottom. It is inverted from intuition and it catches beginners every single cycle.
- **Businesses in structural decline** — the earnings are real today and shrinking permanently.
- **One-off earnings** — an asset sale or legal settlement inflates a single year's EPS, deflating the P/E artificially.

## When a high P/E is perfectly rational

The mirror-image error is calling every high P/E a bubble. A stable, slow-growing consumer company like [KO](/stocks/ko) and a fast-growing platform will not, and should not, trade at the same multiple.

Rough intuition: if a company can grow earnings 25% a year for five years, today's $1 of profit becomes about $3.05. A P/E of 45 on today's earnings is a P/E of roughly 15 on year-five earnings. The multiple is a statement about the future, not the present. The question is never "is 45 too high" — it is **"what growth rate does 45 require, and is that realistic?"**

## The three comparisons that make P/E useful

Never look at a P/E in isolation. Compare it three ways:

1. **Against its own sector.** Compare [TSLA](/stocks/tsla) to other automakers and [GOOG](/stocks/goog) to other platforms. Comparing across sectors is meaningless — software and airlines live in different universes.
2. **Against its own history.** Is this company at the high or low end of its own five-year range? A business at a P/E of 22 that normally trades at 30 is telling you something changed. Go find out what.
3. **Against the market.** The S&P 500 has historically averaged somewhere in the high teens. Knowing where the index sits gives you a baseline for "expensive."

## A short worked case study

Two companies in the same industry:

| | Company X | Company Y |
| --- | --- | --- |
| Price | $120 | $120 |
| Trailing EPS | $4.00 | $2.00 |
| Trailing P/E | 30 | 60 |
| EPS growth, last 3 years | 4% per year | 38% per year |
| Forward P/E | 28 | 34 |

On trailing numbers, X looks half the price of Y. On forward numbers the gap nearly closes, because Y's earnings are compounding fast. Neither is automatically the better buy — but if you had stopped at "30 is cheaper than 60," you would have missed the entire story. That is the difference between reading a ratio and using one.

## Where P/E simply does not apply

- **Companies losing money.** Negative earnings mean no meaningful P/E. Screeners often show a blank or a dash.
- **Banks and insurers**, where price-to-book is usually more informative.
- **REITs**, where funds from operations replaces earnings.
- **Early-stage growth companies**, where price-to-sales is the common (imperfect) substitute.

## How to actually use this tomorrow

Open the [screener](/screener), sort a sector by P/E, and pick the highest and the lowest. Then spend fifteen minutes on each answering one question: what does the market believe about this company's next three years? Read the latest [earnings report](/blog/how-to-read-earnings-report) to check whether the belief is holding up.

A P/E is not a verdict. It is a well-phrased question. Any article that hands you a threshold — "under 15 is a buy" — is selling you certainty that does not exist. Paste one of those articles into the [Jargon Translator](/translate) and watch how little is left once the jargon comes out.
`,
  },
  {
    slug: "how-to-pick-your-first-stock",
    title: "How to Pick Your First Stock (A Beginner Framework and Checklist)",
    description:
      "A repeatable eight-point checklist for choosing a first company — with a full worked example, the numbers to look up, how to size the position, and the four reasons beginners pick badly.",
    publishedAt: "2026-07-16",
    readMinutes: 11,
    tickers: ["AAPL", "COST", "MSFT", "VOO"],
    tags: ["stock-research", "beginner", "fundamentals"],
    category: "Stock Research",
    imageAlt:
      "A magnifying glass held over a company report with revenue and profit bar charts, representing researching a first stock",
    body: `
Almost nobody picks their first stock. Their first stock picks them — from a group chat, a headline, a video, or a friend who is up 60% and will not shut up about it. That is how I ended up in my first position, and it is why I now think the framework matters more than the company.

What follows is the checklist I actually use, in order, with a worked example at the end. It takes about forty minutes per company. If that sounds like a lot, that is the point: forty minutes of friction is what stops you from buying eleven things you cannot explain.

## Before the checklist: the one filter that eliminates 95% of the market

**Can you explain what this company sells, and who pays for it, in two sentences, without using the word "solutions"?**

If you cannot, stop. Not because the business is bad, but because you will have no way to evaluate any news about it. When a stock you do not understand drops 20%, you have exactly two options: sell in a panic or hold in ignorance. Neither is investing.

This filter is unglamorous and it works. It rules out most of the market for a beginner and leaves you with companies whose products are in your house.

## The eight-point checklist

1. **Do I use, or clearly understand, the product?** [Costco](/stocks/cost), [Apple](/stocks/aapl), and [Microsoft](/stocks/msft) pass this for most people. A semiconductor equipment supplier probably does not, no matter how good the business is.
2. **Is revenue growing over three to five years?** Not one quarter — a trend. Flat revenue for five years means you are buying a story, not a business.
3. **Is the company actually profitable?** Positive, reasonably stable net income. Unprofitable companies can be great investments, but they are a much harder read and a poor place to start.
4. **How much debt is there relative to profit?** A company earning $2B a year with $60B of debt has less room to survive a bad two years. You do not need a formula; you need to notice the ratio.
5. **How volatile is it?** Look at the 52-week high and low. A stock that ranged from $40 to $130 in a year will test your nerve in a way one that ranged $88–$112 will not.
6. **What does the market already expect?** Check the [P/E ratio](/blog/what-does-pe-ratio-mean) against the company's own sector and history. A high multiple is not disqualifying — it just means the bar is higher.
7. **Who is competing with it, and is the moat real?** Switching costs, scale, brand, network effects, regulation. If a well-funded competitor could replicate the business in two years, be careful.
8. **What would make me sell?** Write it down before you buy. "Two consecutive quarters of falling revenue" is a reason. "It went down" is not.

## Where to find each number without a Bloomberg terminal

Every item above is available free. The company's investor relations page has the quarterly report. The stock page on this site gives you price history, the 52-week range, and a plain-English explanation of recent moves. The [screener](/screener) lets you filter by market cap and volume so you are not evaluating a $200M company by accident, and the [calendar](/calendar) tells you when the next earnings report lands — which matters, because buying two days before earnings is a coin flip, not a thesis.

## A full worked example

Suppose a beginner is considering a large warehouse retailer. Running the checklist:

| Checkpoint | Finding | Verdict |
| --- | --- | --- |
| Understand the product | Membership warehouse clubs; revenue from goods plus annual fees | Pass — you can explain it in one sentence |
| Revenue trend | Grown every year for the last five | Pass |
| Profitability | Consistently profitable, thin but stable margins | Pass |
| Debt | Modest relative to annual profit | Pass |
| Volatility | 52-week range roughly $780–$1,080, about ±16% around the middle | Manageable |
| Valuation | P/E near the top of its own 5-year range | Caution — a lot of good news is priced in |
| Moat | Membership renewal rates above 90%; scale-based pricing | Strong |
| Sell trigger | Renewal rate falls two years running, or membership growth stalls | Written down |

Score: seven clear passes and one caution. That caution is not a veto — it is a position-sizing instruction. A high-quality business at a rich price deserves a smaller first position, and maybe a second purchase later rather than everything at once.

Now contrast the same checklist applied to a name I once bought purely on momentum: I could not explain the revenue model, revenue was flat, it was unprofitable, debt was heavy, and the 52-week range was $9 to $54. That is five failures. The checklist would have taken four minutes to reject it. I did not run it, and the position taught me a 40% lesson.

## Sizing: the decision that matters more than the pick

Beginners obsess over which stock and ignore how much, which is backwards. A brilliant pick at 60% of your portfolio is a worse decision than an average pick at 5%.

A workable starting structure: keep the majority of your money in a broad-market fund like [VOO](/stocks/voo), and allow yourself a research sleeve of maybe 10–20% for individual companies, with no single name exceeding a quarter of that sleeve. The comparison between the two approaches is laid out in [stocks vs ETFs](/blog/stocks-vs-etfs).

## The four reasons beginners pick badly

- **Familiarity mistaken for analysis.** Knowing the brand is step one of eight, not the whole thing.
- **Buying the story after the move.** By the time a company is a headline, the expectation is in the price.
- **Anchoring on share price.** "It's only $12" is not a reason. Market cap is the size of the company.
- **No sell trigger.** Without one, every decline becomes a debate with yourself, and you will lose that debate at the worst moment.

## Do the whole thing with fake money first

Run the checklist on three companies this week. Buy all three in the [simulator](/simulator), same dollar amount each, and put them on your [watchlist](/watchlist). In ninety days, look at which one moved and — more importantly — whether the reason it moved was something your checklist could have anticipated.

That review is the actual skill. The pick is just the excuse to practice it.
`,
  },
  {
    slug: "how-to-read-earnings-report",
    title: "How to Read an Earnings Report Without an Accounting Degree",
    description:
      "Where the numbers actually live, why revenue and profit diverge, what guidance means, and why a company can beat on every line and still drop 9% — read through a full example quarter.",
    publishedAt: "2026-07-18",
    readMinutes: 10,
    tickers: ["AAPL", "MSFT", "NVDA"],
    tags: ["fundamentals", "stock-research", "earnings"],
    category: "Stock Research",
    imageAlt:
      "A magnifying glass over a quarterly earnings statement showing revenue, net income and guidance figures",
    body: `
Four times a year, every public company publishes a scorecard and the market re-prices it in about ninety seconds. Earnings season is the single best time to learn how markets actually work, and the report itself is far more readable than its reputation suggests — as long as you know the six numbers that matter and ignore the other four hundred.

## The three documents, and which one to open

A company releases three things at once:

- **The press release** — a few pages, the headline numbers, management quotes. Start here.
- **The 10-Q or 10-K** — the full regulatory filing. Detailed, dry, authoritative. Use it for specifics.
- **The earnings call** — management talking to analysts for an hour. The transcript is where the tone lives, and the analyst Q&A at the end is the most honest part of the whole event.

For your first year, the press release plus a skim of the Q&A gets you 90% of the value.

## The six numbers

1. **Revenue** — total money that came in. The top line. Everything else is what happened to it on the way down.
2. **Net income** — what was left after every cost, tax, and charge. The bottom line.
3. **EPS** — net income divided by shares outstanding. This is what headlines quote, and it can rise purely because the company bought back shares.
4. **Margins** — profit as a percentage of revenue. This is the quality signal. Rising revenue with falling margins means growth is being bought rather than earned.
5. **Segment breakdown** — which parts of the business grew. A company can post +8% overall while its most important division shrinks.
6. **Guidance** — management's forecast for next quarter. Frequently the most important item on the page, and the reason the stock moves the way it does.

## Revenue is not profit, and the gap is the business

This trips up more beginners than anything else. Walk down a simplified income statement:

| Line | Amount | What it means |
| --- | --- | --- |
| Revenue | $10.0B | Everything customers paid |
| Cost of revenue | −$5.5B | Direct cost of delivering it |
| Gross profit | $4.5B | 45% gross margin |
| Operating expenses | −$2.8B | Salaries, R&D, marketing, overhead |
| Operating income | $1.7B | 17% operating margin |
| Interest and tax | −$0.5B | Debt costs and government |
| **Net income** | **$1.2B** | 12% net margin — what actually belongs to shareholders |

Ten billion dollars of revenue became $1.2 billion of profit. Now imagine next quarter revenue grows to $11B but net income falls to $0.9B. Revenue is up 10% and the stock drops, because margins compressed from 12% to 8%. The company is selling more and keeping less. That single dynamic explains a huge share of "why did it fall on good news" days.

## Why a company beats every number and still falls 9%

Because the price already contained the beat.

The market does not trade against last year's results. It trades against **expectations**. There are two sets: the published analyst consensus, and the unpublished "whisper" number the market has actually priced in, which is usually higher.

A worked case. A company reports:

- Revenue $10.2B vs $10.0B expected — a beat.
- EPS $2.15 vs $2.05 expected — a beat.
- Guidance for next quarter: $10.4B, versus $11.0B expected — a miss.

Two beats, one miss, and the stock falls 9% in after-hours. The past was good; the future was revised down, and stocks are priced on the future. If you only read the headline — "Company beats estimates" — the price action looks insane. It is not. You just read the least important part.

This is exactly the gap the plain-English explanation on each stock page is built to close, and why the [Market Brief](/market-brief) leads with the reason rather than the number.

## A five-minute reading routine

1. Open the press release. Find revenue and EPS, and compare each to the same quarter last year — not to last quarter, since most businesses are seasonal.
2. Calculate net margin: net income ÷ revenue. Compare it to the year-ago margin. Rising, flat, or falling?
3. Scan the segment table. Which division carried the quarter, and which one is quietly shrinking?
4. Find the guidance paragraph. Is next quarter's range above or below what the market expected?
5. Jump to the analyst Q&A. If four analysts ask about the same thing, that thing is the story.

Five minutes, four times a year, per company. That is the entire commitment.

## Vocabulary that shows up and means less than it sounds

- **Non-GAAP / adjusted** — the company's preferred version of profit, excluding items it considers unusual. Sometimes fair, sometimes flattering. Always compare it to the GAAP number sitting nearby.
- **One-time charge** — a cost management says will not recur. If it recurs three years running, it is a cost.
- **Constant currency** — growth with exchange-rate effects stripped out. Legitimate for global businesses.
- **Headwinds / tailwinds** — things going against or for the company. Usually a softer way of saying a forecast changed.

When a paragraph is dense enough that you cannot tell whether it is good or bad news, paste it into the [Jargon Translator](/translate). It keeps the numbers and removes the fog.

## Common beginner mistakes on earnings day

- **Buying the day before "because it'll beat."** You are betting on a number you do not have, against people who model it professionally. It is a coin flip with worse odds.
- **Reading only the headline.** The headline is the beat/miss. The guidance is the story.
- **Comparing to the previous quarter instead of the year-ago quarter.** Retailers make most of their money in Q4. Sequential comparisons look alarming for entirely normal reasons.
- **Treating one quarter as a verdict.** Three data points make a trend. One makes a headline.

## Practice on a real one

Use the [calendar](/calendar) to find a company reporting this week that you already follow, and put it on your [watchlist](/watchlist). Before the report, write down what you expect. After, run the five-minute routine and see how the stock reacted versus how you thought it would.

If you want to feel the stakes without paying for them, hold the position through earnings in the [simulator](/simulator) first. Owning something into a report is a very different experience from reading about it afterwards.
`,
  },
  {
    slug: "paper-trading-vs-real-trading",
    title: "Paper Trading vs Real Trading: What Transfers, What Doesn't",
    description:
      "Simulated trading builds real, transferable skill in five specific areas and quietly lies to you in three others. Here's how to practise so the habits survive contact with real money.",
    publishedAt: "2026-07-20",
    readMinutes: 10,
    tickers: ["SPY", "AAPL", "NVDA"],
    tags: ["simulator", "paper-trading", "beginner", "psychology"],
    category: "Platform Education",
    imageAlt:
      "A laptop showing a simulated portfolio with a green price chart beside a real brokerage statement, comparing practice and live trading",
    body: `
I turned $100,000 of simulated money into roughly $180,000 during a school trading competition, and I have rarely been more wrong about my own ability. A few weeks later, a single short position that I was completely certain about unwound the whole thing. Nothing about the outcome was real. Everything about the lesson was.

That gap — real skill, fake stakes — is what this article is about. Paper trading is genuinely valuable, and it is genuinely misleading, and knowing which is which determines whether the practice helps you or teaches you bad habits at speed.

## What transfers completely

**1. Mechanics.** Market vs limit orders, how a fill works, what a bid-ask spread costs you, what happens to your position through a split or a dividend. These are identical in a simulator because they are just rules. Getting them wrong with real money costs money; getting them wrong here costs nothing.

**2. Research process.** The forty minutes you spend running a checklist on a company before buying is the same forty minutes either way. If you build the habit of writing a one-sentence thesis before every entry, that habit walks straight into your real account.

**3. Cause and effect.** This is the biggest one. When you own something, you notice why it moved. Owning ten simulated positions through an earnings season teaches you more about what drives prices than a year of reading. Every trade in the [simulator](/simulator) comes back with a plain-English explanation of the move, which is the feedback loop a brokerage will never give you.

**4. Position sizing arithmetic.** Learning that a 20% loss on a 30% position costs you 6% of everything is pure math, and math does not care whether the dollars are real.

**5. Review discipline.** Going back through your closed trades and sorting them into "right for the right reason," "right for the wrong reason," and "wrong" is the single most valuable exercise in trading. It is also the easiest thing to practise when nothing is at stake.

## What does not transfer

**1. Fear.** A 15% drawdown on simulated money is an interesting data point. A 15% drawdown on money you earned is a physical sensation that makes you want to close the app. No simulator reproduces this, and anyone who tells you otherwise is selling something.

**2. Position size discipline under stress.** Because the money is fake, you will take positions you would never take for real. In my competition, I was running concentrated leveraged bets that no sane person would put actual savings into. My "skill" was mostly the absence of consequences.

**3. Liquidity and slippage.** Simulators generally fill you at the quoted price. In reality, size moves the market, especially in smaller names.

Here is the honest side-by-side:

| | Simulator | Real account |
| --- | --- | --- |
| Order mechanics | Identical | Identical |
| Live prices | Same feed | Same feed |
| Research process | Identical | Identical |
| Emotional weight | Near zero | The dominant factor |
| Position sizing behaviour | Reckless by default | Conservative by necessity |
| Cost of being wrong | A leaderboard place | Rent |
| Best used for | Learning what to do | Learning whether you can do it |

## The distortion nobody warns you about

Simulated accounts encourage exactly the wrong behaviour: big positions, fast turnover, all-or-nothing bets. That is because the reward structure is a score, not a retirement. Competitions make this worse — if fifty people are ranked by return, the winner is almost always the one who took the most concentrated risk and got lucky, and everyone draws the wrong lesson from watching them.

The fix is to impose the constraints reality would impose:

1. **Set the virtual balance near your real one.** If you will invest $2,000, do not trade $100,000 as though it is yours. Trade a $2,000 slice of it and leave the rest alone.
2. **Cap any single position at 10% of the account.** Write the rule down before you start.
3. **Ban leverage and shorting for your first month.** These are the two features that made my simulated account look brilliant right up until it did not.
4. **Log every trade with a thesis and a sell trigger.** A trade you cannot justify in one sentence does not get placed.
5. **Hold for a minimum of two weeks.** Simulators tempt you into day trading because there is no cost to churn.

## A structured 30-day practice plan

- **Week 1** — five buys only, no sells. Broad ETF like [SPY](/stocks/spy), one large-cap you use, one volatile name like [NVDA](/stocks/nvda), one you deliberately do not understand, one you buy after it has already run 30%.
- **Week 2** — no trades at all. Just read why your positions moved and add candidates to your [watchlist](/watchlist).
- **Week 3** — hold at least one position through an earnings report. Note your reaction before and after.
- **Week 4** — close everything and write a one-page review: which thesis was right, which was luck, which was wrong and why.

That review page is the deliverable. The profit or loss number is not.

## Then make the first real trade small

Once you have run a month of disciplined practice, open a real account and buy one thing for $100–$500, as laid out in [starting with $100](/blog/how-to-start-investing-with-100-dollars). The purpose of the small real position is to introduce the one variable the simulator cannot: caring.

The right sequence is simulator first for mechanics and process, then small real money for temperament, then size up slowly. Skipping the first step means learning the mechanics with money. Skipping the second means believing a leaderboard rank is an investing track record — which is precisely the mistake I made, and the reason this site exists.
`,
  },
  {
    slug: "building-watchlist",
    title: "How to Build a Watchlist That Actually Teaches You Something",
    description:
      "Most watchlists are hoarded ticker piles that get ignored. Here's a three-bucket structure, a weekly ten-minute review routine, and the rules for when a name earns a spot or gets removed.",
    publishedAt: "2026-07-24",
    readMinutes: 9,
    tickers: ["AAPL", "COST", "NVDA", "VOO"],
    tags: ["stock-research", "beginner", "platform"],
    category: "Platform Education",
    imageAlt:
      "A screen showing a curated watchlist of stock tickers with daily percentage changes, organised into groups",
    body: `
My first watchlist had forty-one tickers on it. I could not have told you why more than six of them were there. It was not a research tool, it was a collection — every name I had ever heard mentioned, saved in case it mattered later. It never mattered later. I looked at the whole thing roughly once a month, felt vaguely overwhelmed, and closed the tab.

A watchlist works when it is small enough to review in ten minutes and structured enough that each name is answering a question. Here is how to build one.

## Three buckets, twelve names, hard cap

Do not organise by sector. Organise by **why the name is there**, because that determines what you do with it.

**Bucket 1 — Owned (however many you hold).** Things you have money in, real or simulated. You review these no matter what.

**Bucket 2 — Candidates (four to six names).** Companies that have passed your research checklist and that you would buy at the right price or after the right confirmation. These are the only names you are allowed to actually buy from.

**Bucket 3 — Teachers (three to five names).** Companies you have no intention of buying but that teach you something. A high-volatility name like [NVDA](/stocks/nvda) teaches what a real drawdown looks like. A broad ETF like [VOO](/stocks/voo) is your baseline — without it you cannot tell whether your stock is doing well or the whole market is. A steady, boring compounder like [COST](/stocks/cost) teaches what a decade-long uptrend feels like from the inside.

Twelve total, hard cap. To add a thirteenth, remove one. That constraint is the entire mechanism — it forces you to articulate why a name deserves a slot.

## The entry rule

A ticker gets added only with a written sentence in this shape:

> "I'm watching [company] because [specific reason], and I'll act if [specific trigger]."

Real examples:

- "I'm watching Costco because membership renewal rates are the whole business, and I'll buy a starter position if the P/E comes back to its five-year average."
- "I'm watching this chipmaker because I want to see how a 40x P/E stock behaves through an earnings miss. I will not buy it."

Compare that with the reason 90% of tickers get added: "it was in a headline." That is not a reason, it is an impression, and it is why watchlists rot.

## The ten-minute Sunday review

Once a week, not once a day. Daily checking trains reaction; weekly checking trains observation.

1. **Open your [watchlist](/watchlist)** and read the week's percentage change for each name. (Because it saves to your account, it follows you between your phone and laptop rather than living in one browser.)
2. **Find the biggest mover, up or down.** One name.
3. **Answer why.** Read the plain-English explanation on that stock's page, or check whether it appeared in the [Market Brief](/market-brief) that week. Was it company news, sector news, or the whole market moving?
4. **Compare against your baseline ETF.** If your stock is down 4% and the market is down 3.5%, essentially nothing happened to your company. Beginners burn enormous emotional energy on moves that were just the market.
5. **Write one line in a notes file.** Date, ticker, what happened, what you learned. Nothing else.
6. **Prune.** Any candidate you have not looked at in a month, or whose thesis you can no longer state, comes off.

Ten minutes. Fifty-two times a year that is nine hours, and it will teach you more than any course.

## Where the names come from

Do not source candidates from social media. Use the [screener](/screener) with deliberately boring filters — a market cap floor of a few billion dollars and a real daily volume requirement — which immediately removes the thinly traded microcaps that generate the most exciting-looking charts and the worst outcomes.

Then apply the two-sentence test from [how to pick your first stock](/blog/how-to-pick-your-first-stock): if you cannot explain what the company sells and who pays for it, it does not go on the list, however good the chart looks.

For candidates, also note the next earnings date from the [calendar](/calendar). Knowing a report is nine days out changes how you interpret every move until then.

## A worked example of the list doing its job

Say your list has a retailer as a candidate at $88, with the note "buy if it revisits the low $70s." Three weeks later it drops to $74 on a day when the entire consumer sector fell 5% on a rate decision.

Without the list, that is a scary headline and you do nothing. With it, you have a pre-written trigger, and you can immediately distinguish two very different situations: the company deteriorated, or the sector got repriced and your company came along for the ride. Checking the explanation on the stock page settles it in about ninety seconds.

That is the whole value proposition. The watchlist converts a vague, emotional moment into a decision you already made when you were calm.

## Four ways watchlists fail

- **Too many names.** Past about fifteen, you stop reviewing and start scrolling.
- **No baseline.** Without a market ETF on the list you cannot separate company news from market news.
- **Checking constantly.** Multiple looks per day trains impulse, which is the opposite of the goal.
- **Never removing anything.** A list is a working set, not an archive. If the thesis is gone, the ticker goes.

Build the twelve, run one Sunday review, and test the candidates by buying them in the [simulator](/simulator) before any real money is involved. The list is not there to make you money. It is there to make you notice things.
`,
  },

  {
    slug: "stocks-vs-etfs",
    title: "Stocks vs. ETFs: Which Should a Beginner Actually Buy?",
    description:
      "A side-by-side comparison with real numbers — what happens to $5,000 in one company versus 500, why diversification is not free, and the core-and-satellite structure most beginners should copy.",
    publishedAt: "2026-07-26",
    readMinutes: 9,
    tickers: ["VOO", "VTI", "AAPL", "SPY"],
    tags: ["investing-basics", "beginner", "etfs"],
    category: "Investing Basics",
    imageAlt:
      "A basket holding many coloured blocks beside a single block, illustrating an ETF holding hundreds of companies versus one stock",
    body: `
Picture two people who each put $5,000 into the market on the same Monday. One buys a single company. The other buys an S&P 500 ETF. A year later, one of them has a story and the other has a return, and which is which depends entirely on luck.

That is not a joke — it is the actual difference. One decision has a range of outcomes roughly five times wider than the other, and understanding that range is more important than the debate over which is "better."

## What you are literally buying

A **stock** is a fractional ownership claim on one business. Its price depends on that business's results and on what investors expect from it.

An **ETF** is a single ticker that holds a basket. Buy one share of a broad-market fund like [VOO](/stocks/voo) or [VTI](/stocks/vti) and you own a proportional sliver of hundreds or thousands of companies, rebalanced for you, for a fee typically around 0.03% a year — three dollars annually per $10,000.

## The outcome range, with numbers

| Scenario over one year | $5,000 in one large-cap stock | $5,000 in a broad-market ETF |
| --- | --- | --- |
| Great year | +45% → $7,250 | +22% → $6,100 |
| Typical year | +9% → $5,450 | +9% → $5,450 |
| Bad year | −38% → $3,100 | −18% → $4,100 |
| Worst realistic case | Company fails, near total loss | Market falls hard, then historically recovers |

The middle row is the honest one: in an average year the two look similar. The value of the ETF shows up in the tails. A single company can go to zero from fraud, obsolescence, or a lost lawsuit. A diversified index cannot, because for it to reach zero every company in it would have to fail simultaneously.

## Diversification is not free, and pretending otherwise is dishonest

The cost of owning 500 companies is that you own the mediocre ones too. If one holding triples, it barely registers in a broad fund. Concentration is the only way to dramatically outperform — and also the main way people dramatically underperform.

The other hidden cost: ETFs are boring, and boring things get abandoned. Plenty of beginners buy an index fund, feel nothing for four months, and drift into speculative names looking for something to happen.

## The structure I'd actually recommend

Core and satellite:

1. **Core (80–90%)** — one broad-market ETF. This is your baseline and the thing you keep buying regardless of the news.
2. **Satellite (10–20%)** — two to four individual companies you have researched properly, using the checklist in [how to pick your first stock](/blog/how-to-pick-your-first-stock).
3. **No single satellite position above a quarter of the satellite sleeve.** On a $5,000 portfolio, that is a maximum of about $250 per company.

This gets you the market's return as a floor, plus a real research education, and it caps the damage when one of your picks is wrong. And you will be wrong; the question is only how expensive it is.

## The ETF traps beginners walk into

- **Owning three funds that hold the same things.** An S&P 500 fund, a total-market fund, and a large-cap growth fund overlap enormously. That is one position wearing three hats.
- **Thematic and leveraged ETFs.** A "3x daily" fund is not a leveraged version of the index over a year — daily rebalancing decays it. These are trading instruments, not holdings.
- **Assuming an ETF is inherently safe.** A single-sector fund concentrated in one industry can fall 40%. Diversification within a sector is not diversification.
- **Comparing your stock to nothing.** Keep a market ETF on your [watchlist](/watchlist) permanently. If your stock is down 4% on a day the market is down 3.5%, essentially nothing happened.

## Test the difference before funding it

Open the [simulator](/simulator), split the virtual balance evenly between one broad ETF and three individual companies, and leave it for a quarter. Then compare not just the returns but how often you felt the urge to do something about each. Most people discover the satellite sleeve consumed 95% of their attention for a fraction of the outcome — which is exactly the argument for keeping it small.

## The questions to answer before you buy either one

For an **ETF**, four things tell you almost everything: what index it tracks, the expense ratio, how much it holds in assets, and how concentrated its top ten positions are. A broad-market fund with a 0.03% fee and hundreds of billions under management is a commodity product — the version from any large provider is close to interchangeable. If the top ten holdings are 40% of the fund, understand that you own an index in name and a handful of very large companies in practice.

For a **stock**, you need a one-sentence answer to "how does this company make money, and why will it make more in three years?" If you cannot write that sentence without looking anything up, you are not ready to own it in size. Everything else — margins, debt, valuation — sits on top of that sentence.

## How taxes and account type quietly change the answer

Individual stocks tempt you to trade, and trading in a taxable account creates a tax bill on every gain you realise. Broad ETFs are naturally tax-efficient because you rarely sell them and they rarely distribute large capital gains internally. If your investing lives in a tax-advantaged retirement account, this matters less; in a regular brokerage account it can be worth more than the difference in returns. This is not tax advice — it is a reason the boring option often wins on the after-tax number even when the pre-tax numbers are similar.

## The short version

Buy the ETF for the return you need. Buy individual stocks for the education you want, in amounts small enough that the education stays cheap. Almost every beginner reverses those two.
`,
  },
  {
    slug: "what-moves-stock-prices",
    title: "What Actually Moves Stock Prices (It Isn't the News)",
    description:
      "Prices move on the gap between reality and expectation. Here's how earnings, interest rates, sector rotation and pure flow interact — and how to tell which one is behind today's move.",
    publishedAt: "2026-07-20",
    readMinutes: 9,
    tickers: ["NVDA", "AAPL", "SPY"],
    tags: ["market-education", "beginner", "earnings"],
    category: "Market Education",
    imageAlt:
      "A stock exchange building with a wavy market line running through it, representing the forces that move share prices",
    body: `
Here is the sentence that took me longest to understand, and it explains almost every confusing day in the market:

**Prices do not move on news. They move on the difference between the news and what was already expected.**

A company can report record profits and fall 9%. Another can report a loss and rally 12%. Neither is irrational. In both cases the price already contained a forecast, and the report either exceeded or fell short of it.

## The five forces, roughly in order of importance

**1. Earnings versus expectations.** Every quarter, results land against a consensus forecast. Beating the forecast matters; the absolute number does not. This is why "great quarter, stock down" happens constantly — full walkthrough in [how to read an earnings report](/blog/how-to-read-earnings-report).

**2. Guidance.** Management's forecast for the next quarter frequently moves the stock more than the results themselves, because markets price the future. A company can beat on revenue and EPS, guide slightly low, and drop hard.

**3. Interest rates.** This is the one beginners underrate. A stock is worth today's value of its future profits. When rates rise, future profits are discounted more heavily, so the value falls — and it falls most for companies whose profits are furthest in the future. That is why a rate decision can knock 4% off a fast-growing tech name and barely touch a utility, on a day when neither company did anything.

**4. Sector and market flow.** On many days your stock moves purely because money rotated into or out of its whole sector. Nothing company-specific happened at all.

**5. Positioning and psychology.** Crowded trades unwind violently. When everyone already owns something, there is no one left to buy, and mild disappointment produces an outsized drop.

## Diagnosing today's move in ninety seconds

| What you observe | Most likely cause |
| --- | --- |
| Your stock −3%, market −3%, sector −3% | Market-wide. Your company is a passenger. |
| Your stock −8%, sector −1%, market flat | Company-specific. Go find the news. |
| Whole sector −5%, other sectors flat | Sector rotation or a policy/rate story |
| Big move on tiny volume | Thin, low-conviction, often reverses |
| Big move on 4x volume | Real repricing by large holders |

Run this before you read a single headline and you will avoid the most common beginner error: attributing a market-wide move to your specific company and concluding your thesis is broken.

## A worked example

Say [NVDA](/stocks/nvda) drops 6% on a Wednesday. The panic reading is "something is wrong with the company."

Check the market: [SPY](/stocks/spy) is down 1.8%. Check the sector: semiconductors are down 4.5%. Check the calendar: a central bank statement came out at 2pm that was more hawkish than expected.

Now the move decomposes into roughly 1.8% market, another 2.7% sector-wide rate sensitivity, and about 1.5% specific to the company. The company-specific portion — the only part that reflects on your thesis — is small. Nothing about the business changed that afternoon; the discount rate applied to its future did.

That decomposition is exactly what the explanation on each stock page and the [Market Brief](/market-brief) are built to do, grounded in what was actually reported rather than a guess.

## What moves prices far less than people think

- **Most headlines.** By the time an article is published, the information is usually priced.
- **Analyst ratings.** Occasionally a catalyst, usually noise, often lagging the price.
- **"The company is good."** Quality is not a catalyst. Everyone can see it, so it is already in the price. Change is what moves prices.
- **Your entry price.** The market has no idea what you paid, and the stock has no obligation to return to it.

## The mistakes this understanding prevents

- Selling a good company because the sector had a bad week.
- Buying before earnings hoping for a beat, when the beat is already expected.
- Reading a bullish article and assuming you are early.
- Judging a thesis on a five-day price move.

## Two more forces worth knowing

**Supply of shares.** Buybacks shrink the share count, which mechanically raises earnings per share even if profits are flat. New share issuance and the expiry of insider lock-ups do the opposite. Neither is news in the dramatic sense, and both move prices.

**Index and fund flows.** When a company is added to a major index, every fund tracking that index has to buy it, regardless of price or opinion. That is pure mechanical demand. The same thing happens in reverse on removal. If a stock jumps 6% on a day with no company news and no sector move, an index change or a large institutional rebalance is often the answer.

## Why the same news moves two companies differently

Rising oil prices lift an energy producer and squeeze an airline. A weaker currency helps an exporter and hurts an importer. A rate cut helps companies with heavy debt and unprofitable growth companies most, and helps a cash-rich, already-profitable business least. Before you ask "is this news good or bad," ask "good or bad *for whose business model*." Beginners tend to treat headlines as universally bullish or bearish; the market treats them as a redistribution.

## Time horizon changes the answer entirely

Over a day, prices move on flow, positioning and headlines. Over a quarter, they move on earnings and guidance. Over a decade, they move on one thing only: whether the business grew its profits. That is why day-to-day explanations feel unsatisfying — they are describing noise honestly. If your holding period is years, the only force in the list above that ultimately decides your outcome is force number one.

## Practise the decomposition

For two weeks, pick one mover a day from your [watchlist](/watchlist), split the move into market, sector, and company, and write down the split. It is the closest thing to a superpower a beginner can build cheaply — and you can test your conclusions in the [simulator](/simulator) without paying for the wrong ones.
`,
  },
  {
    slug: "beginner-investor-mistakes",
    title: "The Nine Mistakes That Cost Beginner Investors the Most",
    description:
      "Ranked by how much damage they actually do, with the arithmetic behind each — oversizing, churning, stop-loss misuse, leverage, and the revenge trade that ends most beginner accounts.",
    publishedAt: "2026-07-22",
    readMinutes: 10,
    tickers: ["SPY", "VOO", "NVDA"],
    tags: ["risk-management", "beginner", "psychology"],
    category: "Risk Management",
    imageAlt:
      "An umbrella and shield over a falling price chart, representing protecting a beginner portfolio from avoidable losses",
    body: `
Beginners rarely lose money because they picked the wrong company. They lose it because of position size, turnover, and timing — three things entirely within their control. Here are the nine mistakes ranked by the damage they actually do, with the arithmetic, because the numbers are more persuasive than the advice.

## 1. Oversizing a single position

The one that ends accounts. Put 50% of your money into one name and a 40% decline costs you 20% of everything. At 5% position size, the same disaster costs 2%.

Losses are also asymmetric: down 50% requires +100% to recover; down 20% requires +25%. Small losses are survivable in a way large ones are not.

**Fix:** no single company above 5–10% of the portfolio. Write the cap down before you start.

## 2. Trading too often

A study-worthy pattern: the more a beginner trades, the worse they do. Every round trip pays a spread, occasionally a fee, and — worst of all — replaces a considered thesis with a reaction.

Ten unnecessary round trips a year at a 0.2% spread each is 2% of your account gone before you have made a single decision correctly.

**Fix:** a minimum holding period. Two weeks in a simulator, three months for real money, unless your written sell trigger fires.

## 3. The revenge trade

You lose $300, and instead of stopping you double the next position to "make it back." This is the single fastest way to turn a bad week into a closed account. It converts an investing decision into an emotional one, at exactly the moment your judgement is worst.

**Fix:** after any loss above 10% of a position, place no new trades for 48 hours. No exceptions.

## 4. Leverage and short selling, too early

I learned this in a competition. My simulated account was up around 80% and I was convinced I had figured something out, so I put on a leveraged short. The position moved against me, the leverage magnified it, and even with stop losses the damage was severe. On real money that would have been catastrophic.

Leverage does not increase your edge. It multiplies whatever you already have — including a negative one. Shorting adds unlimited theoretical loss to the mix, since a stock can rise indefinitely.

**Fix:** neither, in year one. Not even in a simulator until you have a year of boring results.

## 5. Misusing stop-loss orders

Stops are useful and widely misunderstood. Two specific failures:

- **Too tight.** A 5% stop on a stock that routinely swings 4% a day will trigger on noise, repeatedly, each time locking in a loss.
- **Assuming a guaranteed price.** A stop becomes a market order when triggered. If the stock gaps down overnight from $80 to $61, your $75 stop fills near $61.

**Fix:** set stops relative to the stock's own volatility, not a round number, and treat them as a discipline tool rather than insurance.

## 6. Confusing a low share price with value

A $4 stock is not cheaper than a $400 stock. What matters is market cap and earnings — see [what P/E ratio means](/blog/what-does-pe-ratio-mean). Low-priced stocks feel accessible and are usually low-priced for a reason.

## 7. Chasing what already moved

If it is up 40% this month and it reached your feed, the expectation is already in the price. You are buying the enthusiasm of people who bought earlier.

## 8. No written sell trigger

Without one, every decline becomes an argument with yourself. Decide in advance: "I sell if revenue declines two quarters running," or "if the thesis I wrote is disproven." Not "if it goes down."

## 9. Judging a decision by its outcome

A reckless trade that made money is still a bad decision, and it is the most dangerous thing that can happen to a beginner, because it reinforces the behaviour. Grade your process: was the thesis sound, was the size right, did you follow your rules? Outcome and quality are only loosely related over short periods.

## The damage, side by side

| Mistake | Typical cost | How avoidable |
| --- | --- | --- |
| Oversizing | 20–50% of the account | Entirely — it is one rule |
| Overtrading | 2–5% a year, plus worse decisions | Entirely |
| Revenge trading | Often the rest of the account | Entirely, with a 48-hour rule |
| Leverage | Total loss possible | Entirely — just don't |
| Bad stops | Repeated small locked-in losses | Mostly |

## Practise the rules where they are cheap

Every one of these is a rule you can rehearse in the [simulator](/simulator) at zero cost — cap positions at 10%, hold for two weeks minimum, no leverage, write a sell trigger for every entry. Then keep a [watchlist](/watchlist) of names you did *not* buy and check in a quarter later. Watching the trades you avoided is a surprisingly effective way to learn patience.

Compare everything to a baseline like [SPY](/stocks/spy). Most beginner losses are not losses to the market; they are losses relative to having simply held it.
`,
  },
  {
    slug: "investing-psychology",
    title: "Investor Psychology: Why You Sell at the Bottom",
    description:
      "Loss aversion, recency bias and anchoring explained through what they feel like in a real drawdown — plus a written pre-commitment plan that works better than willpower.",
    publishedAt: "2026-07-21",
    readMinutes: 9,
    tickers: ["SPY", "VOO"],
    tags: ["psychology", "risk-management", "beginner"],
    category: "Market Psychology",
    imageAlt:
      "A head silhouette containing a volatile market line, representing fear and greed driving investor decisions",
    body: `
The uncomfortable finding across decades of research is that the average investor earns meaningfully less than the average investment they own. The funds do fine. The people buy them after good years and sell them after bad ones.

That gap is not an information problem. Everyone knows to buy low. It is a psychology problem, and the only reliable defence is a plan written down while you are calm.

## Loss aversion, and why −10% feels like −25%

Losing $1,000 hurts roughly twice as much as gaining $1,000 feels good. This asymmetry produces two contradictory behaviours in the same person:

- **Selling winners too early**, to lock in a gain before it disappears.
- **Holding losers too long**, because selling makes the loss real.

The result is a portfolio that systematically keeps the worst positions and sells the best. If you have ever thought "I'll sell it when it gets back to what I paid," that is loss aversion talking — and the market has no idea what you paid.

## Recency bias

Whatever happened most recently feels like what will keep happening. After three green months, risk feels theoretical and people size up. After three red months, a recovery feels impossible and people go to cash — usually near the bottom, because that is when the feeling peaks.

## Anchoring

Your entry price becomes a reference point with no economic meaning. A stock you bought at $100 that is now $70 is not "cheap" — it is $70, and the only question is what it is worth from here. Someone who bought at $40 is looking at the identical company and feeling great.

## What a drawdown actually feels like

This is the part nobody prepares you for, and the reason simulated confidence is unreliable.

- **Week 1, −6%:** mild interest. You check twice a day.
- **Week 3, −14%:** you start reading bearish articles, and they are unusually persuasive.
- **Week 5, −22%:** you have a story about why this time is different. You are checking hourly.
- **Week 6:** you sell, and feel immediate relief. Relief is the tell. Relief is what selling at the bottom feels like from the inside.

Historically, the market has recovered from every one of these. That fact is useless in week five, which is why the decision has to be made in week zero.

## The pre-commitment plan

Written rules beat willpower because they are made by a version of you who is not scared. Mine:

1. **A maximum position size**, decided before any purchase. Nothing above 10% in one company.
2. **A written thesis per position** — one sentence on why, one on what would disprove it.
3. **A scheduled review day.** Once a week, not continuously. Notifications off.
4. **A 48-hour rule** after any loss over 10%: no new trades.
5. **A pre-planned response to a −20% market.** Mine is "buy the scheduled amount, change nothing." Deciding this in advance is the single highest-value thing on the list.
6. **A trade journal** with the reason for every entry and exit. Reading your own panic from six months ago is remarkably effective inoculation.

## Rehearse it where it's free

You cannot fully simulate fear, and I would not claim otherwise — the honest limits are in [paper trading vs real trading](/blog/paper-trading-vs-real-trading). But you can rehearse the *procedure* until it is automatic: hold a position in the [simulator](/simulator) through an earnings report and a bad week without touching it, and note your reaction each time.

Then make the real position small enough that week five is survivable. Size is the real emotional control; everything else is commentary.

## Two sanity checks that defuse most panic

- **Compare to the market.** Keep [SPY](/stocks/spy) or [VOO](/stocks/voo) on your [watchlist](/watchlist). If you are down 8% and the market is down 7%, nothing happened to your company.
- **Find the actual cause.** Read the plain-English explanation of the move on the stock page or in the [Market Brief](/market-brief). "Rates repriced the whole sector" and "our main product is failing" both look like red numbers, and they demand opposite responses.

Most panic is the absence of an explanation. Get the explanation, check your written rules, and the urge usually passes.

## Confirmation bias and the research trap

Once you own something, your reading changes. You start seeking articles that agree with you and dismissing the ones that don't, and it happens without any sense of dishonesty — the agreeable article simply seems better argued. The fix is procedural: before you buy, write down the two strongest arguments *against* the position. If you cannot find two, you have not researched enough. Revisit them at your weekly review and ask whether either has become more true.

The related trap is mistaking effort for edge. Reading forty articles about a company you already own is not research; it is reassurance. Real research changes a number in your thesis.

## Herding, and why crowds feel like information

When everyone you follow owns the same stock, the agreement feels like evidence. It isn't — it is one opinion repeated. Crowded positions are also the ones that fall hardest on mild bad news, because there is nobody left to buy. If a name arrives in your feed from five directions in a week, treat that as a reason to be slower, not faster.

## Overconfidence after a winning streak

The most dangerous moment in a beginner's first year is not a loss. It is a run of three or four wins, which reliably produces the conclusion "I have figured this out" — and then a larger position, then leverage. Short-run results contain almost no information about skill. A useful habit: after any strong stretch, deliberately keep your position sizes exactly where they were. The rule exists precisely for the moment you feel it is unnecessary.

## Grade the process, not the score

At the end of each month, review your trades and score only three things: was the thesis written before the trade, was the size within your cap, and did you follow your own sell trigger. You can score three out of three on a month you lost money — and that is the month you did this correctly.
`,
  },
  {
    slug: "compound-growth",
    title: "Compound Growth: Why the First Decade Feels Like Nothing",
    description:
      "The arithmetic of compounding worked out year by year, why the curve is flat for years before it bends, what fees and interruptions really cost, and how to survive the boring part.",
    publishedAt: "2026-07-23",
    readMinutes: 9,
    tickers: ["VOO", "VTI", "MSFT"],
    tags: ["wealth-building", "beginner", "long-term"],
    category: "Wealth Building",
    imageAlt:
      "A seedling growing from stacked coins into a taller plant, representing investment returns compounding over decades",
    body: `
Everyone has heard that compounding is powerful. Almost nobody has looked at the year-by-year table, which is a shame, because the table explains why so many people quit: for the first several years, compounding looks broken.

## The actual numbers

Invest $200 a month at an assumed 8% annual return. Contributions and balance, year by year:

| Year | Total contributed | Balance | Growth portion |
| --- | --- | --- | --- |
| 1 | $2,400 | $2,490 | $90 |
| 5 | $12,000 | $14,700 | $2,700 |
| 10 | $24,000 | $36,600 | $12,600 |
| 20 | $48,000 | $118,600 | $70,600 |
| 30 | $72,000 | $298,000 | $226,000 |
| 40 | $96,000 | $700,000 | $604,000 |

Look at year five: you have put in $12,000 and earned $2,700. That is a fine outcome and it feels like nothing, because $2,700 over five years is roughly the price of a used car. This is precisely where most people conclude investing does not work and go looking for something faster.

Now look at year 30 to year 40. Contributions add $24,000. The balance grows by $402,000. Nothing changed about the strategy — the base simply got large enough for the percentage to matter.

## Why the curve bends late

8% of $2,000 is $160. 8% of $300,000 is $24,000. The rate is identical; the base is not. Compounding is not a strategy that improves over time, it is the same strategy applied to a bigger number. Which means the scarce resource is not skill or returns — it is **years**.

A 22-year-old contributing $200/month who stops at 32 and never adds another dollar typically ends up ahead, at 65, of a 32-year-old who contributes $200/month for the next thirty-three years. Ten years of contributions beat thirty-three, purely on timing.

## What interrupts it

**Selling in a downturn.** The 30-year table assumes you were still invested during the worst quarters. Missing a handful of the best days — which cluster immediately after the worst ones — meaningfully reduces the final figure. Selling in week five of a drawdown is the most expensive habit in personal finance, which is why [investor psychology](/blog/investing-psychology) matters more than stock picking.

**Fees.** A 1% annual fee versus 0.03% sounds trivial. Over 40 years on the schedule above, that difference costs roughly a fifth of the final balance. It is the easiest large win available to a beginner: check the expense ratio.

**Withdrawing early.** Every dollar pulled out is not just that dollar; it is that dollar's next 30 years.

## Surviving the boring part

The strategy is not hard. Staying is hard. Three things that help:

1. **Automate the contribution** so it is not a monthly decision requiring conviction.
2. **Track contributions, not returns, for the first three years.** "I have invested for 14 straight months" is a metric you control. Returns are not.
3. **Zoom out.** Open a ten-year chart of [VOO](/stocks/voo) or [MSFT](/stocks/msft). Then look at the 2020 crash and the 2022 drawdown on that same chart — at ten-year scale they are small notches. They did not feel small.

## Where this leaves single-stock picking

Compounding at a market rate for four decades is a genuinely good outcome available to anyone with patience. That is the argument for keeping the majority of your money in a broad fund, as laid out in [stocks vs ETFs](/blog/stocks-vs-etfs), and treating individual companies as the small, educational part of the portfolio.

You can watch the mechanism in the [simulator](/simulator): buy a broad ETF, do nothing for a quarter, and compare it to whatever you actively traded in the same period. For most beginners — including me, the first time I ran that comparison — the untouched position wins, and the lesson lands harder than any table.

## Inflation, and the return that actually matters

An 8% return in a year when prices rose 3% is a 5% gain in what your money can buy. That distinction changes how you think about cash: money left in a low-interest account is not standing still, it is slowly losing purchasing power. Over thirty years, the difference between a real return of 5% and a nominal one of 8% is enormous, which is why long-term projections should always be read as "roughly, before inflation." The table above is not a promise of a lifestyle — it is a promise of a number, and the number buys less each decade.

## What a realistic assumption looks like

Eight percent is a long-run average, not an annual delivery. Real sequences look like +26%, −9%, +14%, +2%, −18%, +31%. The average can be 8% while no individual year is anywhere near it. Two consequences: never plan around a specific year's return, and expect the balance to fall below your total contributions at some point early on. That is normal, it has happened in almost every long investing career, and it is not evidence the plan failed.

## Contributions do the heavy lifting early

In the first five years, how much you add matters far more than what you earn. Raising your monthly contribution from $200 to $300 in year two changes the final figure more than a percentage point of extra return would — and it is entirely under your control, unlike returns. Increase it with every raise, before the money reaches your spending, and let the market do the part you cannot influence.

## One more reason time beats timing

Waiting for a better entry point costs years, and years are the only irreplaceable input in the table. Someone who invests steadily through every level, including the expensive ones, historically ends up far ahead of someone who held cash waiting for a dip that they then hesitated to buy. Starting imperfectly beats starting later.
`,
  },
  {
    slug: "why-i-built-integralstocks",
    title: "Why I Built IntegralStocks: The Story Behind the Platform",
    description:
      "The school trading competition, the short position that unravelled a simulated portfolio, and the specific product decisions that came out of it.",
    publishedAt: "2026-07-28",
    tickers: ["SPY", "AAPL"],
    readMinutes: 8,
    category: "Platform Story",
    tags: ["platform", "beginner"],
    imageAlt:
      "A laptop showing the IntegralStocks dashboard with a green price chart and a plain-English explanation panel",
    body: `
IntegralStocks began with a simple idea: investing education should be easier to understand. When I first started learning about the stock market, most platforms seemed built for people who already spoke the language. Charts, ratios, order types, market news, risk warnings, and analyst opinions were everywhere. Beginner-friendly explanations were not.

My name is William Wolenski, and I built this site to make the learning process clearer, safer, and more practical. The goal was never to tell anyone what to buy. It was to help beginners understand what they are looking at before they decide anything.

## The competition that started it

The original version came out of a school stock market competition. I wanted a tool that would help me understand companies faster and compare them more clearly, so I started building — AI-written summaries, bullish and bearish signals, portfolio tools, explanations of the jargon I kept tripping over.

For a while it worked spectacularly. My simulated portfolio grew fast. I was near the top of the leaderboard and I had a full explanation ready for why that was skill.

It was not skill. It was concentration and leverage in a market that happened to be going my way.

## The trade that changed the product

Eventually I entered a short position I was completely confident in. It moved against me. Leverage multiplied it, and even with stop losses in place — which filled far from where I expected, because a stop becomes a market order the moment it triggers — the position did enormous damage. What had looked like a winning strategy turned out to be a series of risks I had not understood well enough to name.

Losing simulated money is the cheapest tuition available. But the specific thing I learned was not "don't short." It was that **I had no idea why any of my positions moved.** I could see the numbers. I could not explain them. That is not investing; it is reacting quickly.

## The product decisions that came from it

Every meaningful feature on this site traces back to that gap:

1. **Every stock page explains the move in plain English**, grounded in actual reporting rather than a model's guess about what probably happened. Knowing a stock is down 3% is useless. Knowing the sector repriced on a rate decision while the company did nothing is the entire lesson.
2. **The [simulator](/simulator) starts at $100,000, not $1,000,000.** A million-dollar practice account teaches you that a $50,000 position is nothing, which is exactly the instinct that hurt me.
3. **Private games let you set starting cash, duration, and whether leverage is allowed.** Default settings teach default behaviour. A teacher running a 90-day, no-leverage game is teaching something completely different from a two-week free-for-all.
4. **The [leaderboard](/simulator) ranks by return percentage**, so a small account competes fairly with a large one — and, I hope, so people notice that the lowest-turnover account often wins over a full quarter.
5. **The [Jargon Translator](/translate) exists** because I spent months pretending to understand phrases like "sequential margin compression." Paste the paragraph in, get it back in plain English with the numbers intact.
6. **There are no buy signals anywhere on this site.** The AI explains what already happened. Anything that claims to predict is selling confidence, and confidence is what got me into that short.

## What it is not

It is not a brokerage, it does not give financial advice, and it will not tell you what to buy. I am not a professional investor — I am someone who made a specific, memorable mistake early and cared enough to build the tool I wish had existed.

## What comes next

More depth in the [Learn hub](/learn), better research tooling, and a daily [Market Brief](/market-brief) that leads with why rather than what. The clearest expression of what I was going for is an ordinary stock page — pull up [AAPL](/stocks/aapl) or the market itself at [SPY](/stocks/spy) and see whether the explanation actually makes sense to you.

If this site helps one beginner slow down, size a position properly, and understand a move before reacting to it, it is doing what it was built for.
`,
  },
];


export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

/** Canonical slug for a retired/merged post, if one exists. */
export function redirectFor(slug: string): string | undefined {
  return REDIRECTS[slug];
}

/** Blog posts that reference a given ticker in their tickers[] array. */
export function postsForTicker(symbol: string): BlogPost[] {
  const s = symbol.toUpperCase();
  return POSTS.filter((p) => p.tickers?.includes(s));
}

export type BlogBlock = { type: "h2" | "h3" | "p" | "ul" | "ol" | "table"; html: string };

/** Small markdown renderer: headings, paragraphs, bullet/numbered lists, tables, links. */
export function renderBody(body: string): BlogBlock[] {
  const blocks = body.trim().split(/\n\s*\n/);
  const inline = (line: string) =>
    line
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline underline-offset-2 hover:opacity-80">$1</a>');

  const cells = (row: string) =>
    row
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => c.trim());

  return blocks.map((raw): BlogBlock => {
    const line = raw.trim();

    if (line.startsWith("### ")) return { type: "h3", html: inline(line.slice(4)) };
    if (line.startsWith("## ")) return { type: "h2", html: inline(line.slice(3)) };

    if (/^\|/.test(line)) {
      const rows = line.split(/\n/).filter((l) => l.trim().startsWith("|"));
      const isDivider = (l: string) => /^[\s|:-]+$/.test(l.replace(/\|/g, "|"));
      const body_ = rows.filter((l) => !isDivider(l));
      const [headRow, ...dataRows] = body_;
      const head = cells(headRow)
        .map((c) => `<th class="text-left font-bold px-3 py-2 border-b">${inline(c)}</th>`)
        .join("");
      const trs = dataRows
        .map(
          (r) =>
            `<tr>${cells(r)
              .map((c) => `<td class="align-top px-3 py-2 border-b border-border/60">${inline(c)}</td>`)
              .join("")}</tr>`,
        )
        .join("");
      return {
        type: "table",
        html: `<div class="overflow-x-auto rounded-lg border"><table class="w-full text-sm"><thead class="bg-muted/50"><tr>${head}</tr></thead><tbody>${trs}</tbody></table></div>`,
      };
    }

    if (/^\d+\.\s/.test(line)) {
      const items = line
        .split(/\n(?=\d+\.\s)/)
        .map((l) => `<li>${inline(l.trim().replace(/^\d+\.\s/, "").replace(/\n\s*/g, " "))}</li>`)
        .join("");
      return { type: "ol", html: `<ol class="list-decimal pl-6 space-y-2">${items}</ol>` };
    }

    if (/^- /.test(line)) {
      const items = line
        .split(/\n(?=- )/)
        .map((l) => `<li>${inline(l.trim().slice(2).replace(/\n\s*/g, " "))}</li>`)
        .join("");
      return { type: "ul", html: `<ul class="list-disc pl-6 space-y-2">${items}</ul>` };
    }

    return { type: "p", html: inline(line.replace(/\n/g, " ")) };
  });
}
