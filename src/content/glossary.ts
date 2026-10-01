// A permalinked glossary entry per term, one page each at /learn/glossary/:slug.
// Unlike the interactive Learn lessons (which bundle a term into a quiz flow)
// or the Jargon Translator (which only explains whatever you paste in), each
// of these is a stable, single-purpose page that directly answers "what does
// X mean" — the shape of question search engines and AI assistants answer
// most often. `short` is written to stand alone as a quotable one-line answer;
// `body` is the fuller explanation reused from the matching Learn lesson.

export interface GlossaryEntry {
  slug: string;
  term: string;
  short: string;
  body: string;
  category: "basics" | "trading" | "indicators" | "fundamentals";
  learnMore: { label: string; to: string };
  related: string[]; // slugs
}

export const CATEGORY_LABEL: Record<GlossaryEntry["category"], string> = {
  basics: "Basics",
  trading: "Trading",
  indicators: "Indicators",
  fundamentals: "Fundamentals",
};

export const GLOSSARY: GlossaryEntry[] = [
  {
    slug: "what-is-a-stock",
    term: "Stock",
    short:
      "A stock (or \"share\") is a tiny slice of ownership in a public company — if a company has 1,000,000 shares and you own one, you own one-millionth of it.",
    body:
      "A stock (or 'share') is a tiny slice of ownership in a public company. If a company is split into 1,000,000 shares and you own 1, you own one-millionth of it. Stock prices move every second as buyers and sellers agree on a new price.",
    category: "basics",
    learnMore: { label: "Stock Market Basics", to: "/learn/basics" },
    related: ["ticker", "market-cap", "dividends"],
  },
  {
    slug: "ticker",
    term: "Ticker",
    short:
      "A ticker is the short symbol that identifies a stock on an exchange — AAPL for Apple, TSLA for Tesla, MSFT for Microsoft.",
    body:
      "Every public stock has a short symbol called a ticker — AAPL for Apple, TSLA for Tesla, MSFT for Microsoft. Stocks trade on exchanges like NYSE and NASDAQ during market hours (9:30am–4:00pm ET on weekdays).",
    category: "basics",
    learnMore: { label: "Stock Market Basics", to: "/learn/basics" },
    related: ["what-is-a-stock", "market-cap"],
  },
  {
    slug: "bid-ask-spread",
    term: "Bid-Ask Spread",
    short:
      "The bid is the highest price a buyer will pay right now; the ask is the lowest price a seller will accept. The gap between them is the spread.",
    body:
      "The bid is the highest price a buyer will pay right now. The ask is the lowest price a seller will accept. The gap between them is the spread. Tight spreads mean lots of liquidity; wide spreads mean it's harder to trade efficiently.",
    category: "basics",
    learnMore: { label: "Stock Market Basics", to: "/learn/basics" },
    related: ["market-vs-limit-order", "volume"],
  },
  {
    slug: "market-cap",
    term: "Market Cap",
    short:
      "Market capitalization is a company's share price multiplied by its total shares outstanding — it tells you the company's overall size.",
    body:
      "Market capitalization = share price × total shares outstanding. It tells you the company's size: small-cap (under $2B), mid-cap ($2B–$10B), large-cap (over $10B), mega-cap (over $200B). Bigger usually means less volatile.",
    category: "basics",
    learnMore: { label: "Stock Market Basics", to: "/learn/basics" },
    related: ["what-is-a-stock", "pe-ratio", "eps"],
  },
  {
    slug: "dividends",
    term: "Dividend",
    short:
      "A dividend is a cash payment a company shares with its shareholders out of its profits, usually paid quarterly.",
    body:
      "Some companies share their profits with shareholders as cash payments called dividends, usually quarterly. Not all stocks pay dividends — many growth companies reinvest profits instead. Dividend yield = annual dividend ÷ share price.",
    category: "basics",
    learnMore: { label: "Stock Market Basics", to: "/learn/basics" },
    related: ["what-is-a-stock", "pe-ratio"],
  },
  {
    slug: "pe-ratio",
    term: "P/E Ratio",
    short:
      "The price-to-earnings (P/E) ratio is a stock's share price divided by its earnings per share — a P/E of 20 means investors pay $20 today for every $1 of yearly profit.",
    body:
      "Price-to-earnings ratio = share price ÷ earnings per share. A P/E of 20 means investors pay $20 today for every $1 of yearly profit. Higher P/E often means investors expect strong future growth — but it can also signal overvaluation.",
    category: "basics",
    learnMore: { label: "Stock Market Basics", to: "/learn/basics" },
    related: ["market-cap", "dividends", "eps"],
  },
  {
    slug: "bull-vs-bear-market",
    term: "Bull vs Bear Market",
    short:
      "A bull market is a sustained period of rising prices; a bear market is a drop of 20% or more from recent highs.",
    body:
      "A bull market is a sustained period of rising prices (think bull horns charging up). A bear market is a 20%+ drop from recent highs (a bear swiping its paws down). Corrections are 10–20% drops — uncomfortable but normal.",
    category: "basics",
    learnMore: { label: "Stock Market Basics", to: "/learn/basics" },
    related: ["support-resistance"],
  },
  {
    slug: "market-vs-limit-order",
    term: "Market Order vs Limit Order",
    short:
      "A market order fills immediately at the best available price; a limit order only fills at your chosen price or better.",
    body:
      "A market order fills immediately at the best available price — fast but unpredictable. A limit order only fills at your chosen price or better — slower but you control the price. Beginners often use limits to avoid surprises.",
    category: "basics",
    learnMore: { label: "Stock Market Basics", to: "/learn/basics" },
    related: ["bid-ask-spread"],
  },
  {
    slug: "diversification",
    term: "Diversification",
    short:
      "Diversification means spreading your money across many stocks, sectors, and asset types so no single investment can sink your whole portfolio.",
    body:
      "Don't put all your eggs in one basket. Spreading money across many stocks, sectors, and asset types reduces risk — if one company crashes, the others can cushion the blow. ETFs are an easy way to instantly diversify.",
    category: "basics",
    learnMore: { label: "Stock Market Basics", to: "/learn/basics" },
    related: ["what-is-an-etf"],
  },
  {
    slug: "what-is-an-etf",
    term: "ETF",
    short:
      "An ETF (Exchange-Traded Fund) is a basket of stocks you can buy as a single ticker — SPY, for example, tracks the S&P 500's roughly 500 companies in one purchase.",
    body:
      "An ETF (Exchange-Traded Fund) is a basket of stocks you can buy as a single ticker. SPY tracks the S&P 500 — one purchase gives you a slice of 500 companies. ETFs are popular for low-cost, instant diversification.",
    category: "basics",
    learnMore: { label: "Stock Market Basics", to: "/learn/basics" },
    related: ["diversification", "what-is-a-stock"],
  },
  {
    slug: "sma",
    term: "SMA (Simple Moving Average)",
    short:
      "The SMA averages a stock's closing price over the last N days to smooth out daily noise and reveal the underlying trend.",
    body:
      "The SMA averages the closing price over the last N days. A 50-day SMA smooths out daily noise so you can see the underlying trend. Price above its SMA suggests an uptrend bias; price below suggests a downtrend bias.",
    category: "indicators",
    learnMore: { label: "Stock Indicators", to: "/learn/indicators" },
    related: ["ema", "golden-cross"],
  },
  {
    slug: "ema",
    term: "EMA (Exponential Moving Average)",
    short:
      "The EMA is like the SMA but weights recent prices more heavily, so it reacts faster to new price moves.",
    body:
      "The EMA is like the SMA but weights recent prices more heavily, so it reacts faster to new moves. Traders often pair the 12-EMA and 26-EMA to spot momentum shifts before a slower SMA would.",
    category: "indicators",
    learnMore: { label: "Stock Indicators", to: "/learn/indicators" },
    related: ["sma", "macd"],
  },
  {
    slug: "golden-cross",
    term: "Golden Cross & Death Cross",
    short:
      "A Golden Cross is when a stock's 50-day moving average crosses above its 200-day moving average, a classic bullish signal; a Death Cross is the opposite.",
    body:
      "A Golden Cross happens when the 50-day SMA crosses ABOVE the 200-day SMA — a classic bullish signal. A Death Cross is the opposite: 50-day cutting BELOW the 200-day, often a bearish warning.",
    category: "indicators",
    learnMore: { label: "Stock Indicators", to: "/learn/indicators" },
    related: ["sma"],
  },
  {
    slug: "rsi",
    term: "RSI (Relative Strength Index)",
    short:
      "RSI is a momentum indicator from 0-100; readings above 70 often signal a stock is overbought, and below 30 often signal it's oversold.",
    body:
      "RSI is a momentum oscillator from 0 to 100. Above 70 = often overbought (a pullback may be due). Below 30 = often oversold (a bounce may be due). It doesn't predict price — it measures the speed of recent moves.",
    category: "indicators",
    learnMore: { label: "Stock Indicators", to: "/learn/indicators" },
    related: ["stochastic-oscillator", "macd"],
  },
  {
    slug: "macd",
    term: "MACD",
    short:
      "MACD (Moving Average Convergence Divergence) measures the difference between two exponential moving averages to gauge a stock's momentum.",
    body:
      "MACD = 12-EMA minus 26-EMA, plotted with a 9-EMA 'signal line'. When MACD crosses above the signal line, momentum is shifting bullish. When it crosses below, momentum is turning bearish. The histogram shows the gap between them.",
    category: "indicators",
    learnMore: { label: "Stock Indicators", to: "/learn/indicators" },
    related: ["ema", "rsi"],
  },
  {
    slug: "bollinger-bands",
    term: "Bollinger Bands",
    short:
      "Bollinger Bands wrap a stock's price between an upper and lower band; the bands widen when volatility rises and pinch tight when it drops.",
    body:
      "Bollinger Bands wrap price between an upper and lower band set 2 standard deviations from a 20-day SMA. Bands widen when volatility rises and pinch tight when it drops — a 'squeeze' often precedes a big move.",
    category: "indicators",
    learnMore: { label: "Stock Indicators", to: "/learn/indicators" },
    related: ["atr", "sma"],
  },
  {
    slug: "volume",
    term: "Trading Volume",
    short:
      "Volume is the number of shares of a stock traded in a given period; big price moves on high volume are more trustworthy than the same move on low volume.",
    body:
      "Volume is the number of shares traded in a period. Big price moves on high volume are more trustworthy than the same move on low volume. Volume confirms — a breakout without volume often fails.",
    category: "indicators",
    learnMore: { label: "Stock Indicators", to: "/learn/indicators" },
    related: ["vwap", "bid-ask-spread"],
  },
  {
    slug: "vwap",
    term: "VWAP",
    short:
      "VWAP (Volume-Weighted Average Price) is the average price a stock has traded at during the day, weighted by volume, and resets every session.",
    body:
      "VWAP = Volume-Weighted Average Price for the day. Big institutions use it as a benchmark. Price above VWAP means bulls are in control intraday; price below means bears are in control. It resets every trading session.",
    category: "indicators",
    learnMore: { label: "Stock Indicators", to: "/learn/indicators" },
    related: ["volume", "sma"],
  },
  {
    slug: "atr",
    term: "ATR (Average True Range)",
    short:
      "ATR measures a stock's average daily price range over a recent period — it's a volatility gauge, not a direction signal.",
    body:
      "ATR measures average daily price range over N periods (usually 14). It's a volatility gauge, not a direction signal. Traders use ATR to size positions and set stop-loss distances — wider ATR means wider stops.",
    category: "indicators",
    learnMore: { label: "Stock Indicators", to: "/learn/indicators" },
    related: ["bollinger-bands"],
  },
  {
    slug: "stochastic-oscillator",
    term: "Stochastic Oscillator",
    short:
      "The Stochastic Oscillator compares a stock's current closing price to its recent high/low range on a 0-100 scale, similar to RSI.",
    body:
      "Stochastic compares the current close to the high/low range over a lookback period, on a 0–100 scale. Like RSI: above 80 is overbought, below 20 is oversold. The %K line crossing the %D line is a common trigger.",
    category: "indicators",
    learnMore: { label: "Stock Indicators", to: "/learn/indicators" },
    related: ["rsi"],
  },
  {
    slug: "support-resistance",
    term: "Support & Resistance",
    short:
      "Support is a price level where buyers tend to step in (a floor); resistance is where sellers tend to appear (a ceiling).",
    body:
      "Support is a price level where buyers tend to step in (the floor). Resistance is where sellers tend to appear (the ceiling). When price breaks resistance, it often becomes new support — and vice versa.",
    category: "indicators",
    learnMore: { label: "Stock Indicators", to: "/learn/indicators" },
    related: ["bull-vs-bear-market"],
  },
  {
    slug: "fibonacci-retracement",
    term: "Fibonacci Retracement",
    short:
      "A Fibonacci retracement marks the levels — 38.2%, 50%, and 61.8% of a prior move — where a stock's price often pulls back before continuing its trend.",
    body:
      "After a big move, price often pulls back to 38.2%, 50%, or 61.8% of the move before continuing. These Fibonacci levels are common spots where traders watch for bounces or reversals.",
    category: "indicators",
    learnMore: { label: "Stock Indicators", to: "/learn/indicators" },
    related: ["support-resistance"],
  },
  {
    slug: "stop-loss-order",
    term: "Stop-Loss Order",
    short:
      "A stop-loss order automatically sells a stock once it drops to a price you set, capping how much you can lose on a trade.",
    body:
      "A stop-loss order automatically sells a stock once it falls to a price you choose, capping your downside without you having to watch the screen all day. A $50 stock with a stop at $45 sells on its own if it falls that far — your loss is capped near 10%, fees and slippage aside.",
    category: "trading",
    learnMore: { label: "Advanced Strategies", to: "/learn/advanced" },
    related: ["short-selling", "atr"],
  },
  {
    slug: "short-selling",
    term: "Short Selling",
    short:
      "Short selling means borrowing shares to sell now, hoping to buy them back later at a lower price and pocket the difference — it profits when a stock falls.",
    body:
      "Short selling flips the usual order: you borrow shares and sell them first, hoping to buy them back later at a lower price and return them, pocketing the difference. It profits when a stock falls, but losses are theoretically unlimited since a stock's price can keep rising.",
    category: "trading",
    learnMore: { label: "Advanced Strategies", to: "/learn/advanced" },
    related: ["short-squeeze", "stop-loss-order"],
  },
  {
    slug: "short-squeeze",
    term: "Short Squeeze",
    short:
      "A short squeeze happens when a heavily shorted stock rises sharply, forcing short sellers to buy shares to cover their position — which pushes the price up even further.",
    body:
      "When a lot of investors have shorted a stock and it starts rising instead of falling, short sellers rush to buy shares back to limit their losses (called 'covering'). That buying pressure pushes the price up even more, which forces more shorts to cover — a feedback loop that can send a stock sharply higher in days.",
    category: "trading",
    learnMore: { label: "Advanced Strategies", to: "/learn/advanced" },
    related: ["short-selling", "float"],
  },
  {
    slug: "beta",
    term: "Beta",
    short:
      "Beta measures how much a stock tends to move compared to the overall market — a beta of 1.5 means it typically moves 50% more than the market, up or down.",
    body:
      "Beta measures a stock's volatility relative to the market (usually the S&P 500, set at 1.0). A beta of 1.5 means the stock typically swings 50% more than the market in both directions; a beta of 0.5 means it's calmer. High-beta stocks amplify both gains and losses.",
    category: "fundamentals",
    learnMore: { label: "Advanced Strategies", to: "/learn/advanced" },
    related: ["volatility", "atr"],
  },
  {
    slug: "52-week-high-low",
    term: "52-Week High/Low",
    short:
      "A stock's 52-week high and low are the highest and lowest prices it has traded at over the past year — quick reference points for where the current price stands.",
    body:
      "The 52-week high and low are the highest and lowest prices a stock has hit in the trailing year. Traders use them as quick reference points — a stock near its 52-week high shows strength, while one near its low may be out of favor or genuinely in trouble.",
    category: "trading",
    learnMore: { label: "Reading the Market", to: "/learn/reading" },
    related: ["support-resistance", "volatility"],
  },
  {
    slug: "eps",
    term: "EPS (Earnings Per Share)",
    short:
      "EPS is a company's profit divided by its number of outstanding shares — it's the per-share profit figure that feeds directly into the P/E ratio.",
    body:
      "Earnings per share = net income ÷ shares outstanding. It's the per-share slice of a company's profit, and it's the denominator in the P/E ratio (price ÷ EPS). Rising EPS over time is one of the clearest signs a company is actually growing, not just its stock price.",
    category: "fundamentals",
    learnMore: { label: "Advanced Strategies", to: "/learn/advanced" },
    related: ["pe-ratio", "market-cap"],
  },
  {
    slug: "ipo",
    term: "IPO (Initial Public Offering)",
    short:
      "An IPO is the first time a private company sells shares to the public, listing on an exchange so anyone can buy in.",
    body:
      "An IPO (Initial Public Offering) is how a private company 'goes public' — it sells shares to public investors for the first time and lists on an exchange like the NYSE or NASDAQ. IPO stocks can be volatile early on since there's little trading history yet to anchor the price.",
    category: "basics",
    learnMore: { label: "Stock Market Basics", to: "/learn/basics" },
    related: ["what-is-a-stock", "ticker"],
  },
  {
    slug: "blue-chip-stock",
    term: "Blue-Chip Stock",
    short:
      "A blue-chip stock is shares in a large, well-established, financially stable company — think Apple, Coca-Cola, or Johnson & Johnson.",
    body:
      "Blue-chip stocks belong to large, well-established, financially sound companies with a long track record — think Apple, Coca-Cola, or Johnson & Johnson. They're generally less volatile than smaller companies and often pay steady dividends, though they rarely grow as fast as newer, smaller companies.",
    category: "basics",
    learnMore: { label: "Stock Market Basics", to: "/learn/basics" },
    related: ["market-cap", "dividends"],
  },
  {
    slug: "volatility",
    term: "Volatility",
    short:
      "Volatility measures how much and how fast a stock's price swings up and down — high volatility means bigger, faster moves in both directions.",
    body:
      "Volatility measures how much a stock's price swings over time. A highly volatile stock might move 5% in a single day; a low-volatility stock might barely move 0.5%. Volatility isn't inherently bad — it just means bigger potential gains and bigger potential losses.",
    category: "fundamentals",
    learnMore: { label: "Advanced Strategies", to: "/learn/advanced" },
    related: ["beta", "atr", "bollinger-bands"],
  },
  {
    slug: "index-fund",
    term: "Index Fund",
    short:
      "An index fund is a fund built to track a market index like the S&P 500 exactly, rather than trying to beat it — low cost, broad diversification, no stock-picking.",
    body:
      "An index fund simply holds the same stocks as a market index (like the S&P 500) in the same proportions, aiming to match its return rather than beat it. Because there's no active stock-picking, fees are usually very low — a big reason index funds are a popular long-term default.",
    category: "basics",
    learnMore: { label: "Stock Market Basics", to: "/learn/basics" },
    related: ["what-is-an-etf", "diversification"],
  },
  {
    slug: "circuit-breaker",
    term: "Circuit Breaker",
    short:
      "A circuit breaker is an automatic, exchange-wide trading halt triggered when the market falls too far too fast, giving traders a pause to react.",
    body:
      "Exchanges use circuit breakers to automatically halt trading market-wide when prices fall sharply in a short time — 7%, 13%, and 20% drops in the S&P 500 each trigger a different level of halt. They exist to stop panic-driven crashes from spiraling further.",
    category: "trading",
    learnMore: { label: "Reading the Market", to: "/learn/reading" },
    related: ["bull-vs-bear-market", "volatility"],
  },
  {
    slug: "after-hours-trading",
    term: "Pre-Market & After-Hours Trading",
    short:
      "Pre-market and after-hours trading happen outside the normal 9:30am–4:00pm ET session — prices can move sharply on lower volume before most investors can react.",
    body:
      "Regular trading runs 9:30am–4:00pm ET, but some brokers allow pre-market (as early as 4am) and after-hours (until 8pm) trading too. Volume is much thinner in these windows, so prices can swing harder on the same news — earnings are usually released right before or after the regular session for this reason.",
    category: "trading",
    learnMore: { label: "Reading the Market", to: "/learn/reading" },
    related: ["ticker", "volume"],
  },
  {
    slug: "stock-split",
    term: "Stock Split",
    short:
      "A stock split divides each existing share into multiple shares, lowering the price per share without changing what the company is actually worth.",
    body:
      "In a 2-for-1 stock split, every share you own becomes two, and the price per share is cut in half — your total investment value doesn't change. Companies split shares mainly to make the price look more accessible to smaller investors; it has no effect on the company's underlying value.",
    category: "basics",
    learnMore: { label: "Stock Market Basics", to: "/learn/basics" },
    related: ["what-is-a-stock", "market-cap"],
  },
  {
    slug: "buyback",
    term: "Stock Buyback",
    short:
      "A buyback is when a company repurchases its own shares from the market, shrinking the share count and boosting earnings per share for everyone who stays in.",
    body:
      "A buyback (share repurchase) is a company using its own cash to buy back its shares from the market. With fewer shares outstanding, each remaining share represents a slightly bigger ownership stake and often a higher EPS — some see it as a sign of confidence, others as a lack of better investment ideas.",
    category: "fundamentals",
    learnMore: { label: "Advanced Strategies", to: "/learn/advanced" },
    related: ["eps", "dividends"],
  },
  {
    slug: "float",
    term: "Float (Shares Outstanding)",
    short:
      "A stock's float is the number of shares actually available for public trading, excluding shares held by insiders or locked up long-term.",
    body:
      "Float is the portion of a company's total shares that's actually free to trade on the open market — it excludes shares held by insiders, founders, or governments that rarely change hands. A 'low-float' stock has relatively few tradable shares, which can make its price swing much harder on the same amount of buying or selling.",
    category: "trading",
    learnMore: { label: "Reading the Market", to: "/learn/reading" },
    related: ["volume", "short-squeeze"],
  },
  {
    slug: "book-value",
    term: "Book Value",
    short:
      "Book value is what a company would theoretically be worth if it sold all its assets and paid off all its debts — its assets minus its liabilities.",
    body:
      "Book value = total assets − total liabilities, essentially a company's net worth on paper. Dividing by shares outstanding gives book value per share, which some investors compare to the stock price (price-to-book ratio) to gauge whether a stock is cheap relative to its hard assets.",
    category: "fundamentals",
    learnMore: { label: "Advanced Strategies", to: "/learn/advanced" },
    related: ["eps", "market-cap"],
  },
  {
    slug: "candlestick-chart",
    term: "Candlestick Chart",
    short:
      "A candlestick chart shows a stock's open, high, low, and close for each period as a single 'candle,' making price patterns easier to read at a glance than a plain line chart.",
    body:
      "Each candlestick shows four prices for a period: open, high, low, and close. The 'body' is the gap between open and close (green/white if it closed higher, red/black if lower); the thin 'wicks' show the high and low. Stacking candles side by side reveals patterns traders use to read momentum and reversals.",
    category: "indicators",
    learnMore: { label: "Reading the Market", to: "/learn/reading" },
    related: ["support-resistance", "volume"],
  },
  {
    slug: "liquidity",
    term: "Liquidity",
    short:
      "Liquidity is how easily a stock can be bought or sold without moving its price — highly liquid stocks trade often with tight bid-ask spreads.",
    body:
      "A liquid stock has lots of buyers and sellers at any given moment, so you can trade in or out at a fair price without moving the market yourself. Illiquid stocks — often small-caps with low volume — can have wide bid-ask spreads and big price jumps on even modest-sized orders.",
    category: "trading",
    learnMore: { label: "Reading the Market", to: "/learn/reading" },
    related: ["bid-ask-spread", "volume"],
  },
];

export const getGlossaryEntry = (slug: string) => GLOSSARY.find((g) => g.slug === slug);
