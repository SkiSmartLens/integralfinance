export const CATEGORIES: { id: string; label: string; query: string; symbols?: string[] }[] = [
  { id: "news", label: "News", query: "stock market" },
  { id: "markets", label: "Markets", query: "stock market today", symbols: ["^GSPC", "^DJI", "^IXIC", "^RUT", "^VIX"] },
  { id: "tech", label: "Tech", query: "technology stocks", symbols: ["AAPL","MSFT","NVDA","GOOGL","META","AMZN","TSLA","AMD","NFLX","ORCL"] },
  { id: "crypto", label: "Crypto", query: "cryptocurrency bitcoin", symbols: ["BTC-USD","ETH-USD","SOL-USD","BNB-USD","XRP-USD","DOGE-USD","ADA-USD"] },
  { id: "earnings", label: "Earnings", query: "earnings report" },
  { id: "energy", label: "Energy", query: "energy stocks oil", symbols: ["XOM","CVX","COP","SLB","BP","SHEL","OXY"] },
  { id: "finance", label: "Finance", query: "bank stocks finance", symbols: ["JPM","BAC","WFC","GS","MS","C","BLK"] },
  { id: "healthcare", label: "Healthcare", query: "healthcare pharma", symbols: ["JNJ","PFE","LLY","UNH","MRK","ABBV","TMO"] },
  { id: "consumer", label: "Consumer", query: "consumer retail", symbols: ["WMT","COST","HD","NKE","MCD","SBUX","TGT"] },
  { id: "ipo", label: "IPOs", query: "IPO new listing" },
  { id: "world", label: "World", query: "global markets europe asia", symbols: ["^FTSE","^GDAXI","^FCHI","^N225","^HSI","000001.SS"] },
  { id: "commodities", label: "Commodities", query: "gold oil commodities", symbols: ["GC=F","SI=F","CL=F","NG=F","HG=F","ZC=F"] },
  { id: "currencies", label: "Currencies", query: "forex currencies dollar", symbols: ["EURUSD=X","GBPUSD=X","USDJPY=X","USDCAD=X","AUDUSD=X","DX-Y.NYB"] },
  { id: "politics", label: "Politics", query: "fed reserve policy economy" },
  { id: "ai", label: "AI", query: "artificial intelligence stocks" },
  { id: "ev", label: "EVs", query: "electric vehicle stocks", symbols: ["TSLA","RIVN","LCID","NIO","XPEV","LI","F","GM"] },
];

export const INDEX_TICKERS = ["^GSPC","^DJI","^IXIC","^RUT","^VIX","CL=F","GC=F","BTC-USD","ETH-USD","EURUSD=X","^FTSE","^N225"];
export const TRENDING = ["AAPL","MSFT","NVDA","GOOGL","META","AMZN","TSLA","AMD","NFLX","ORCL","BTC-USD","ETH-USD"];
