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
  "stock-market-terms-explained-simply": "how-to-invest-in-stocks-with-no-experience",
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
    slug: "how-to-invest-in-stocks-with-no-experience",
    title: "How to Invest in Stocks With No Experience",
    description:
      "A 90-day plan from complete beginner to first real position — the money you need in place first, the fifteen terms that actually come up, and a week-by-week schedule that ends in a trade you understand.",
    publishedAt: "2026-07-11",
    readMinutes: 10,
    tickers: ["VOO", "VTI", "SPY"],
    tags: ["beginner", "getting-started", "glossary"],
    category: "Beginner Basics",
    imageAlt:
      "A gold coin beside a step-by-step rising chart, representing a beginner's first 90 days of learning to invest",
    body: `
Most "how to start investing" advice fails in the same place: it tells you to open an account and buy an index fund, then stops. That is technically correct and practically useless, because the part people struggle with is not the buy button. It is the six weeks after, when the position is red and nobody has explained why.

So this is a 90-day plan instead of a list of tips. It assumes zero experience and it ends with you owning something you can explain to another person.

## Days 1–7: get the money right before the market

You cannot invest your way out of a cash problem, and market timing does not fix a 24% credit card APR. Before anything else:

1. **Hold one month of expenses in cash.** Not six — one is enough to start. It stops a flat tire from becoming a forced sale.
2. **Kill debt above roughly 8% interest.** Paying off a 24% balance is a guaranteed 24% return. No stock offers that with certainty.
3. **Name your time horizon.** Money you need inside three years does not belong in stocks. Say the number out loud: "this is money I will not touch until 2031."

If you fail this week, do not skip to week two. Everything downstream depends on being able to hold through a bad month.

## Days 8–21: the fifteen terms that actually come up

You do not need a glossary of 200 words. In your first month you will meet about fifteen, and here they are in one sentence each:

- **Share** — one unit of ownership in a company.
- **Ticker** — the short code that identifies it, like VOO or AAPL. Tickers are how every quote, chart, and news feed refers to a company, so learning to read one is step zero.
- **Market cap** — share price × total shares. This, not share price, tells you how big a company is.
- **ETF** — a single ticker that holds a basket of companies.
- **Index** — a scoreboard of a group of stocks, like the S&P 500.
- **Bid / ask** — the highest price a buyer will pay and the lowest a seller will take. The gap between them is the spread, and it is a hidden cost.
- **Market order** — buy now at whatever the price is. **Limit order** — buy only at your price or better.
- **Volume** — how many shares traded. High volume on a move means the move is real.
- **EPS** — profit divided by shares outstanding.
- **P/E ratio** — price divided by EPS, covered fully in [what P/E ratio actually means](/blog/what-does-pe-ratio-mean).
- **Dividend** — cash the company pays you for holding.
- **Earnings report** — the quarterly scorecard, walked through in [how to read an earnings report](/blog/how-to-read-earnings-report).
- **Volatility** — how violently the price swings, in either direction.
- **Drawdown** — how far you are down from the peak.
- **Position size** — how much of your money is in one thing. The most underrated term on this list.

When something outside this list shows up in an article — "sequential margin compression," "hawkish guidance" — paste the paragraph into the [Jargon Translator](/translate) instead of pretending you understood it. It rewrites the article in plain English and keeps the numbers intact.

## Days 22–45: trade fake money badly, on purpose

This is the part that gets skipped, and skipping it is why so many people quit after one loss.

Open the [simulator](/simulator), take the $100,000 virtual balance, and place at least ten trades. Not careful trades — varied ones. Buy a boring ETF. Buy a volatile tech name. Buy something right before its earnings date, which you can find on the [calendar](/calendar). Deliberately buy something after it has already run 30% so you can watch what happens.

The goal is not profit. The goal is to have felt these five things before real money is involved:

- Watching a position drop 8% and doing nothing.
- Placing a limit order and having it not fill.
- Owning a stock through an earnings report.
- Seeing your total balance move while you were asleep.
- Reading the plain-English explanation of why one of your holdings dropped, and realizing it had nothing to do with the company.

## Days 46–75: build a real watchlist

Now narrow. Use the [screener](/screener) to filter for companies above a few billion in market cap with reasonable trading volume, and add eight to twelve names to your [watchlist](/watchlist) that pass one filter: **you can explain what the company sells to a twelve-year-old.**

Then watch them for a month without buying. Every week, open the [Market Brief](/market-brief) and see whether any of your names show up in the movers. When one does, click through and read why. This is the single highest-leverage habit in the whole plan — you are learning cause and effect on companies you have chosen to care about.

## Days 76–90: buy one thing, small

Pick one. Size it so that a 30% loss would annoy you but not hurt you — for most beginners that is $100 to $500. Place a market order during regular hours. Write down, in one sentence, why you bought it and what would make you sell.

Then stop. Do not check it daily. Set a reminder for 30 days out.

## What to deliberately avoid in year one

Options, margin, leverage, short selling, day trading, and anything sold as "signals" or "alerts." Every one of these amplifies mistakes you do not yet know you are making. I learned that in a simulator by blowing up a short position that I was certain was safe, which cost me nothing but taught me everything — that story is in [why I built this site](/blog/why-i-built-integralstocks).

## The honest expectation

Ninety days in, you will own one small position, understand maybe fifteen terms, and have a watchlist. You will not be good at this yet. But you will have replaced the vague anxiety of "investing is complicated" with a specific, boring routine, and the routine is what compounds. Structured lessons for the next ninety days are in the [Learn hub](/learn).
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
    slug: "best-stock-simulator-for-beginners",
    title: "How to Choose a Stock Simulator (and What Ours Does Differently)",
    description:
      "Most simulator reviews are written for day traders. Here are the seven things that actually matter when you have never placed a trade — and an honest account of what IntegralStocks does and doesn't do.",
    publishedAt: "2026-07-03",
    readMinutes: 8,
    tickers: ["SPY", "AAPL"],
    tags: ["simulator", "paper-trading", "beginner"],
    category: "Platform Education",
    imageAlt:
      "A laptop displaying a practice trading account with a green portfolio chart, a leaderboard and a virtual cash balance",
    body: `
Search "best stock simulator" and you get lists written for people who already trade — comparisons of order-routing options, Level 2 data, and hotkey support. If you have never placed a trade in your life, none of that is relevant, and the fanciest platform on those lists is actively the worst place to start.

Here is what actually matters when you are at zero, in the order it matters.

## The seven criteria

1. **Live prices, not delayed quotes.** A fifteen-minute lag breaks the feedback loop. You place a trade, the price you see is not the price you got, and the chart never matches your memory of the moment. Delayed data is fine for studying history and useless for building instinct.
2. **No credit card, no waitlist.** If a "free" simulator wants payment details, it is a funnel for a brokerage, and the education is the bait.
3. **An explanation of why prices moved.** This is the single biggest differentiator. Knowing your position is down 3% is worthless. Knowing it is down 3% because the whole sector sold off on a rate decision — while the company itself did nothing — is the lesson.
4. **A realistic starting balance.** Some platforms hand you $1,000,000. That is not generosity, it is a distortion: at that size, a $50,000 position feels like nothing, so you learn to bet recklessly. Somewhere between $10,000 and $100,000 keeps decisions proportionate.
5. **A post-trade recap.** The trade is not the learning event. The review is.
6. **A reason to come back.** Most simulator accounts are abandoned within nine days. Competition solves this better than willpower does.
7. **A UI that does not assume vocabulary.** If the order ticket says "GTC / IOC / FOK" with no explanation, the platform was not built for you.

## What our simulator does

I will be specific rather than promotional, because vague claims are exactly the problem with the category.

| Feature | How it works here |
| --- | --- |
| Starting balance | $100,000 virtual, configurable when you create a private game |
| Prices | The same live feed that powers our stock pages — no delay |
| Why it moved | After each trade, a plain-English summary of what drove that stock, grounded in real reporting rather than guesswork |
| Leaderboard | Ranked by return percentage, so a $10,000 account competes fairly with a $100,000 one |
| Multiplayer | Create a private game with a join code, set the starting cash, duration, and whether leverage is allowed |
| Cost | Free, no card |
| Watchlist | Syncs to your account, so the names you track follow you across devices |

The custom-game settings exist because of a specific failure mode: default settings teach default behaviour. If you want a class or a group of friends to practise long-term investing rather than gambling, set a 90-day duration and turn leverage off. If you want to demonstrate exactly how leverage destroys accounts, turn it on and watch what happens over three weeks. Both are useful lessons; they just need different settings.

## What it deliberately does not do

- **No options chain in the simulator.** Options are a fast way to lose money in a way that teaches you nothing about businesses.
- **No "AI picks" or buy signals.** The AI here explains what already happened. It does not predict, and a platform that claims to is selling you confidence, not analysis.
- **No day-trading tooling.** No hotkeys, no Level 2. Not an oversight — churn is the main way beginners lose money, and I am not going to make it faster.

## A first session that is actually worth doing

Give it twenty minutes:

1. Open the [simulator](/simulator) and look at [SPY](/stocks/spy) before touching anything. Note today's move.
2. Buy $10,000 of it. That is 10% of the account — a deliberately normal-sized position.
3. Buy $5,000 of a company whose product is in the room with you, like [AAPL](/stocks/aapl).
4. Read the explanation attached to each fill. Write down one sentence per position about why you bought it.
5. Close the tab and do not return for a week.

The temptation on day one is to place twenty trades. Resist it. Five positions you can explain beat twenty you cannot, and the discipline of holding is the actual thing you are here to build. The full breakdown of which skills carry over to real money is in [paper trading vs real trading](/blog/paper-trading-vs-real-trading).

## A note on how to use the leaderboard

Leaderboards are motivating and quietly dangerous. The person at the top of a short competition is usually the person who took the most concentrated risk, not the best investor — I know, because I was that person once, right up until the position that ended the run.

So use it for consistency, not for rank. Set a 90-day game with friends and compare not just returns but how many trades each person placed. In my experience the lowest-turnover account usually wins by the end, and that finding is worth more than the trophy.
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
