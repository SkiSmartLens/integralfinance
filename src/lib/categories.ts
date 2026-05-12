export interface SubTopic { id: string; label: string; query: string; symbols?: string[]; }

export interface Category {
  id: string;
  label: string;
  query: string;
  symbols?: string[];
  subTopics?: SubTopic[];
}

export const CATEGORIES: Category[] = [
  {
    id: "news",
    label: "News",
    query: "stock market",
    subTopics: [
      { id: "all", label: "Top Stories", query: "stock market" },
      { id: "ipo", label: "IPOs", query: "IPO new listing" },
      { id: "earnings", label: "Earnings", query: "earnings report beat miss" },
      { id: "ma", label: "M&A", query: "merger acquisition deal" },
      { id: "fed", label: "Fed / Rates", query: "federal reserve interest rates" },
      { id: "macro", label: "Macro", query: "inflation GDP jobs report" },
      { id: "analyst", label: "Analyst Calls", query: "upgrade downgrade price target" },
    ],
  },
  {
    id: "markets",
    label: "Markets",
    query: "stock market today",
    symbols: ["^GSPC", "^DJI", "^IXIC", "^RUT", "^VIX"],
    subTopics: [
      { id: "us", label: "US Indices", query: "S&P 500 Dow Nasdaq", symbols: ["^GSPC","^DJI","^IXIC","^RUT"] },
      { id: "futures", label: "Futures", query: "stock futures", symbols: ["ES=F","NQ=F","YM=F","RTY=F"] },
      { id: "vol", label: "Volatility", query: "VIX volatility", symbols: ["^VIX","^VVIX","^MOVE"] },
      { id: "bonds", label: "Bonds", query: "treasury yields bonds", symbols: ["^TNX","^TYX","^FVX","^IRX"] },
    ],
  },
  {
    id: "tech",
    label: "Tech",
    query: "technology stocks",
    symbols: ["AAPL","MSFT","NVDA","GOOGL","META","AMZN","TSLA","AMD","NFLX","ORCL"],
    subTopics: [
      { id: "mega", label: "Mega Caps", query: "FAANG mega cap tech", symbols: ["AAPL","MSFT","NVDA","GOOGL","META","AMZN"] },
      { id: "semis", label: "Semis", query: "semiconductor chip stocks", symbols: ["NVDA","AMD","INTC","TSM","AVGO","MU","QCOM","AMAT"] },
      { id: "software", label: "Software", query: "software SaaS stocks", symbols: ["MSFT","ORCL","CRM","ADBE","NOW","SNOW","PLTR"] },
      { id: "cyber", label: "Cybersecurity", query: "cybersecurity stocks", symbols: ["CRWD","PANW","ZS","FTNT","S","NET"] },
    ],
  },
  {
    id: "crypto",
    label: "Crypto",
    query: "cryptocurrency bitcoin",
    symbols: ["BTC-USD","ETH-USD","SOL-USD","BNB-USD","XRP-USD","DOGE-USD","ADA-USD"],
    subTopics: [
      { id: "majors", label: "Majors", query: "bitcoin ethereum", symbols: ["BTC-USD","ETH-USD","SOL-USD","BNB-USD"] },
      { id: "alts", label: "Alts", query: "altcoin", symbols: ["XRP-USD","DOGE-USD","ADA-USD","AVAX-USD","DOT-USD","LINK-USD"] },
      { id: "miners", label: "Miners / Stocks", query: "crypto stocks miners", symbols: ["COIN","MSTR","MARA","RIOT","HUT","CLSK"] },
    ],
  },
  {
    id: "energy", label: "Energy", query: "energy stocks oil",
    symbols: ["XOM","CVX","COP","SLB","BP","SHEL","OXY"],
    subTopics: [
      { id: "oilgas", label: "Oil & Gas", query: "oil gas majors", symbols: ["XOM","CVX","COP","BP","SHEL","TTE"] },
      { id: "services", label: "Services", query: "oil services", symbols: ["SLB","HAL","BKR","FTI"] },
      { id: "renew", label: "Renewables", query: "renewable energy solar wind", symbols: ["FSLR","ENPH","SEDG","RUN","NEE","ICLN"] },
    ],
  },
  {
    id: "finance", label: "Finance", query: "bank stocks finance",
    symbols: ["JPM","BAC","WFC","GS","MS","C","BLK"],
    subTopics: [
      { id: "banks", label: "Big Banks", query: "big banks earnings", symbols: ["JPM","BAC","WFC","C","GS","MS"] },
      { id: "regional", label: "Regionals", query: "regional banks", symbols: ["USB","PNC","TFC","KEY","RF","CFG"] },
      { id: "ins", label: "Insurance", query: "insurance stocks", symbols: ["BRK-B","AIG","MET","PRU","ALL","TRV"] },
      { id: "pay", label: "Payments", query: "payments fintech", symbols: ["V","MA","PYPL","SQ","AXP"] },
    ],
  },
  {
    id: "healthcare", label: "Healthcare", query: "healthcare pharma",
    symbols: ["JNJ","PFE","LLY","UNH","MRK","ABBV","TMO"],
    subTopics: [
      { id: "pharma", label: "Pharma", query: "pharma drug", symbols: ["JNJ","PFE","LLY","MRK","ABBV","BMY","NVO"] },
      { id: "biotech", label: "Biotech", query: "biotech FDA", symbols: ["AMGN","REGN","VRTX","GILD","BIIB","MRNA"] },
      { id: "devices", label: "Devices / Insurers", query: "medical devices insurers", symbols: ["UNH","CI","ELV","HUM","MDT","ABT","ISRG"] },
    ],
  },
  {
    id: "consumer", label: "Consumer", query: "consumer retail",
    symbols: ["WMT","COST","HD","NKE","MCD","SBUX","TGT"],
    subTopics: [
      { id: "retail", label: "Retail", query: "retail sales", symbols: ["WMT","COST","TGT","HD","LOW","TJX"] },
      { id: "luxury", label: "Brands", query: "consumer brands", symbols: ["NKE","LULU","MCD","SBUX","CMG","DIS"] },
      { id: "ecom", label: "E-Commerce", query: "ecommerce online retail", symbols: ["AMZN","SHOP","EBAY","ETSY","MELI"] },
    ],
  },
  { id: "ipo", label: "IPOs", query: "IPO new listing" },
  {
    id: "world", label: "World", query: "global markets europe asia",
    symbols: ["^FTSE","^GDAXI","^FCHI","^N225","^HSI","000001.SS"],
    subTopics: [
      { id: "eu", label: "Europe", query: "european stocks", symbols: ["^FTSE","^GDAXI","^FCHI","^STOXX50E"] },
      { id: "asia", label: "Asia", query: "asian markets", symbols: ["^N225","^HSI","000001.SS","^KS11","^TWII"] },
      { id: "em", label: "Emerging", query: "emerging markets", symbols: ["EEM","VWO","EWZ","INDA","FXI","EWW"] },
    ],
  },
  {
    id: "commodities", label: "Commodities", query: "gold oil commodities",
    symbols: ["GC=F","SI=F","CL=F","NG=F","HG=F","ZC=F"],
    subTopics: [
      { id: "metals", label: "Metals", query: "gold silver copper", symbols: ["GC=F","SI=F","HG=F","PL=F","PA=F"] },
      { id: "energy", label: "Energy", query: "oil natgas", symbols: ["CL=F","BZ=F","NG=F","HO=F","RB=F"] },
      { id: "ag", label: "Agriculture", query: "wheat corn soy", symbols: ["ZC=F","ZW=F","ZS=F","KC=F","SB=F","CT=F"] },
    ],
  },
  {
    id: "currencies", label: "Currencies", query: "forex currencies dollar",
    symbols: ["EURUSD=X","GBPUSD=X","USDJPY=X","USDCAD=X","AUDUSD=X","DX-Y.NYB"],
    subTopics: [
      { id: "majors", label: "Majors", query: "major currency pairs", symbols: ["EURUSD=X","GBPUSD=X","USDJPY=X","USDCHF=X","AUDUSD=X","USDCAD=X"] },
      { id: "dxy", label: "Dollar Index", query: "DXY dollar index", symbols: ["DX-Y.NYB","UUP"] },
      { id: "em", label: "EM FX", query: "emerging currencies", symbols: ["USDMXN=X","USDBRL=X","USDINR=X","USDZAR=X","USDTRY=X"] },
    ],
  },
  { id: "politics", label: "Politics", query: "fed reserve policy economy" },
  { id: "ai", label: "AI", query: "artificial intelligence stocks", symbols: ["NVDA","MSFT","GOOGL","META","AMD","PLTR","SMCI","ARM"] },
  {
    id: "ev", label: "EVs", query: "electric vehicle stocks",
    symbols: ["TSLA","RIVN","LCID","NIO","XPEV","LI","F","GM"],
    subTopics: [
      { id: "pure", label: "Pure-play", query: "EV makers", symbols: ["TSLA","RIVN","LCID","NIO","XPEV","LI"] },
      { id: "legacy", label: "Legacy", query: "legacy automakers EV", symbols: ["F","GM","STLA","TM","HMC"] },
      { id: "battery", label: "Battery / Supply", query: "EV battery lithium", symbols: ["ALB","LAC","SQM","PLUG","BLDP"] },
    ],
  },
];

export const INDEX_TICKERS = ["^GSPC","^DJI","^IXIC","^RUT","^VIX","CL=F","GC=F","BTC-USD","ETH-USD","EURUSD=X","^FTSE","^N225"];
export const TRENDING = ["AAPL","MSFT","NVDA","GOOGL","META","AMZN","TSLA","AMD","NFLX","ORCL","BTC-USD","ETH-USD"];

// Sector ETFs for the heatmap.
export const SECTORS: { symbol: string; name: string }[] = [
  { symbol: "XLK", name: "Technology" },
  { symbol: "XLC", name: "Communications" },
  { symbol: "XLY", name: "Discretionary" },
  { symbol: "XLP", name: "Staples" },
  { symbol: "XLF", name: "Financials" },
  { symbol: "XLV", name: "Healthcare" },
  { symbol: "XLI", name: "Industrials" },
  { symbol: "XLE", name: "Energy" },
  { symbol: "XLU", name: "Utilities" },
  { symbol: "XLB", name: "Materials" },
  { symbol: "XLRE", name: "Real Estate" },
];
