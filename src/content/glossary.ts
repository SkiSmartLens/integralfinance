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
  category: "basics" | "indicators";
  learnMore: { label: string; to: string };
  related: string[]; // slugs
}

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
    related: ["what-is-a-stock", "pe-ratio"],
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
    related: ["market-cap", "dividends"],
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
];

export const getGlossaryEntry = (slug: string) => GLOSSARY.find((g) => g.slug === slug);
