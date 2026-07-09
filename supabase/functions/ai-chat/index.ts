import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Msg { role: "user" | "assistant" | "system"; content: string }

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const SYSTEM = `You are Integral, the live AI guide for Integral Stocks.

You can BOTH talk to the user AND take actions in the app for them. You can answer ANY question about ANY publicly traded stock, ETF, index, crypto, or FX pair. The user's request will be enriched below with LIVE market data (quotes, key stats, recent news) for any tickers/companies they mentioned — USE THAT DATA in your answer. Quote whatever numbers, dates, and headlines are relevant.

If the user asks something that requires data you do not have (e.g. detailed multi-year financial statements), give your best informed estimate using the data provided plus general knowledge about the company, and clearly note any assumption. Never refuse — always give a thoughtful answer.

Take action by appending a JSON block at the very end of your message:

<<<ACTIONS>>>
[ { "type": "...", "payload": { ... } }, ... ]
<<<END>>>

Available actions:
- { "type": "navigate", "payload": { "path": "/" | "/screener" | "/sim" | "/watchlist" | "/calendar" } }
- { "type": "setCategory", "payload": { "id": "<category id>", "sub": "<optional sub id>" } }
- { "type": "selectSymbol", "payload": { "symbol": "AAPL" } }
- { "type": "addWidget", "payload": { "id": "top_gainers"|"top_losers"|"most_active"|"trending"|"sectors"|"indices"|"my_watchlist" } }
- { "type": "removeWidget", "payload": { "id": "..." } }
- { "type": "reorderWidgets", "payload": { "order": [...] } }
- { "type": "resetWidgets", "payload": {} }
- { "type": "addToWatchlist", "payload": { "symbol": "TSLA" } }
- { "type": "removeFromWatchlist", "payload": { "symbol": "TSLA" } }
- { "type": "scrollTo", "payload": { "target": "chart"|"news"|"summary"|"widgets" } }

Category catalog: news (all, ipo, earnings, ma, fed, macro, analyst), markets (us, futures, vol, bonds), tech (mega, semis, software, cyber), crypto (majors, alts, miners), energy (oilgas, services, renew), finance (banks, regional, ins, pay), healthcare (pharma, biotech, devices), consumer (retail, luxury, ecom), world (eu, asia, em), commodities (metals, energy, ag), currencies (majors, dxy, em), politics, ai, ev (pure, legacy, battery).

Rules:
- Whenever the user asks about a specific company/stock, ALSO emit a selectSymbol action so the dashboard updates.
- Keep prose focused and useful. For deep stock questions, write 4-8 sentences with concrete numbers from the live data block. For navigation chit-chat, keep it 1-3 sentences.
- Use markdown sparingly (bold for headlines, lists for multi-point answers).`;

const COMMON_WORDS = new Set([
  "I","A","AN","THE","IS","ARE","WAS","WERE","HAS","HAVE","HAD","DO","DOES","DID","WILL","CAN","COULD","SHOULD","WOULD","MAY","MIGHT","MUST",
  "AND","OR","BUT","IF","THEN","ELSE","FOR","TO","OF","IN","ON","AT","BY","WITH","FROM","AS","ABOUT","INTO","OVER","UNDER",
  "WHAT","WHEN","WHERE","WHY","WHO","HOW","WHICH","THAT","THIS","THESE","THOSE","IT","ITS","THEY","THEM","HE","SHE","YOU","YOUR","ME","MY","WE","OUR","US",
  "AI","CEO","CFO","COO","CTO","IPO","ETF","NYSE","NASDAQ","SEC","FED","FOMC","GDP","USA","EU","UK","NEWS","STOCK","STOCKS","PRICE","BUY","SELL","HOLD","TODAY","NOW","YES","NO","OK","OKAY","PLEASE","THANKS","HI","HEY",
  "REVENUE","EARNINGS","GROWTH","MARGIN","MARGINS","PROFIT","DEBT","CASH","FORECAST","OUTLOOK","RISK","RISKS","TARGET","CHART","SUMMARY","REPORT","Q1","Q2","Q3","Q4","EPS","PE","PEG","ROI","DCF",
]);

async function yfetch(url: string): Promise<any | null> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

async function searchSymbol(term: string): Promise<string | null> {
  const j = await yfetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(term)}&quotesCount=3&newsCount=0`);
  const hit = j?.quotes?.find((q: any) => q?.symbol && (q.quoteType === "EQUITY" || q.quoteType === "ETF" || q.quoteType === "CRYPTOCURRENCY" || q.quoteType === "INDEX" || q.quoteType === "CURRENCY")) ?? j?.quotes?.[0];
  return hit?.symbol ?? null;
}

async function quoteFor(symbol: string): Promise<any | null> {
  const j = await yfetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`);
  return j?.quoteResponse?.result?.[0] ?? null;
}

async function summaryFor(symbol: string): Promise<any | null> {
  const modules = "summaryProfile,financialData,defaultKeyStatistics,earnings,recommendationTrend,price";
  const j = await yfetch(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`);
  return j?.quoteSummary?.result?.[0] ?? null;
}

async function newsFor(symbol: string): Promise<string[]> {
  const j = await yfetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=0&newsCount=6`);
  const items = j?.news ?? [];
  return items.slice(0, 6).map((n: any) => n?.title).filter(Boolean);
}

function fmt(n: any, d = 2): string {
  if (n == null || typeof n !== "number" || !isFinite(n)) return "—";
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
  return n.toFixed(d);
}

function pickVal(v: any): any { return v && typeof v === "object" && "raw" in v ? v.raw : v; }

async function gatherStockContext(symbol: string): Promise<string | null> {
  const sym = symbol.toUpperCase();
  const [q, s, news] = await Promise.all([quoteFor(sym), summaryFor(sym), newsFor(sym)]);
  if (!q && !s) return null;
  const name = q?.longName || q?.shortName || s?.price?.longName || sym;
  const profile = s?.summaryProfile ?? {};
  const fin = s?.financialData ?? {};
  const ks = s?.defaultKeyStatistics ?? {};
  const earn = s?.earnings ?? {};
  const rec = s?.recommendationTrend?.trend?.[0] ?? {};

  const lines: string[] = [];
  lines.push(`### ${name} (${sym})`);
  if (profile.sector || profile.industry) lines.push(`Sector: ${profile.sector ?? "—"} · Industry: ${profile.industry ?? "—"}`);
  if (q?.regularMarketPrice != null) {
    lines.push(`Price: ${fmt(q.regularMarketPrice)} ${q.currency ?? ""} · Change: ${fmt(q.regularMarketChange)} (${fmt(q.regularMarketChangePercent)}%) · Day range: ${fmt(q.regularMarketDayLow)}–${fmt(q.regularMarketDayHigh)} · 52w: ${fmt(q.fiftyTwoWeekLow)}–${fmt(q.fiftyTwoWeekHigh)}`);
  }
  lines.push(`Market cap: ${fmt(q?.marketCap)} · Shares out: ${fmt(q?.sharesOutstanding)} · Avg vol: ${fmt(q?.averageDailyVolume3Month)}`);
  lines.push(`Valuation: P/E (TTM) ${fmt(q?.trailingPE)} · Fwd P/E ${fmt(q?.forwardPE)} · PEG ${fmt(pickVal(ks?.pegRatio))} · P/S ${fmt(pickVal(ks?.priceToSalesTrailing12Months))} · P/B ${fmt(pickVal(ks?.priceToBook))}`);
  lines.push(`Profitability: Gross margin ${fmt(pickVal(fin?.grossMargins) * 100)}% · Op margin ${fmt(pickVal(fin?.operatingMargins) * 100)}% · Profit margin ${fmt(pickVal(fin?.profitMargins) * 100)}% · ROE ${fmt(pickVal(fin?.returnOnEquity) * 100)}%`);
  lines.push(`Growth: Revenue ${fmt(pickVal(fin?.totalRevenue))} · Revenue growth ${fmt(pickVal(fin?.revenueGrowth) * 100)}% YoY · Earnings growth ${fmt(pickVal(fin?.earningsGrowth) * 100)}% YoY · EPS (TTM) ${fmt(q?.epsTrailingTwelveMonths)}`);
  lines.push(`Balance sheet: Cash ${fmt(pickVal(fin?.totalCash))} · Debt ${fmt(pickVal(fin?.totalDebt))} · Debt/Equity ${fmt(pickVal(fin?.debtToEquity))} · Current ratio ${fmt(pickVal(fin?.currentRatio))} · Free cash flow ${fmt(pickVal(fin?.freeCashflow))}`);
  if (fin?.targetMeanPrice || rec?.strongBuy != null) {
    lines.push(`Analyst: target ${fmt(pickVal(fin?.targetMeanPrice))} (low ${fmt(pickVal(fin?.targetLowPrice))} / high ${fmt(pickVal(fin?.targetHighPrice))}) · ratings strongBuy ${rec?.strongBuy ?? "—"} / buy ${rec?.buy ?? "—"} / hold ${rec?.hold ?? "—"} / sell ${rec?.sell ?? "—"} / strongSell ${rec?.strongSell ?? "—"}`);
  }
  if (q?.earningsTimestampStart || q?.earningsTimestamp) {
    const ts = (q.earningsTimestampStart ?? q.earningsTimestamp) * 1000;
    lines.push(`Next earnings: ${new Date(ts).toUTCString()}`);
  }
  if (profile.longBusinessSummary) {
    lines.push(`Business: ${String(profile.longBusinessSummary).slice(0, 600)}`);
  }
  if (news.length) {
    lines.push(`Recent headlines:\n${news.map((t) => `- ${t}`).join("\n")}`);
  }
  return lines.join("\n");
}

async function resolveCandidates(text: string, contextSymbol?: string): Promise<string[]> {
  const found = new Set<string>();
  if (contextSymbol) found.add(contextSymbol.toUpperCase());

  // 1) Explicit uppercase tickers (1–5 letters), plus $TICKER, plus ^INDEX, plus crypto like BTC-USD
  for (const m of text.matchAll(/\$([A-Za-z]{1,5})\b/g)) found.add(m[1].toUpperCase());
  for (const m of text.matchAll(/\b([A-Z]{1,5})(?:[-.][A-Z]{1,3})?\b/g)) {
    const t = m[1];
    if (!COMMON_WORDS.has(t) && t.length >= 2) found.add(t);
  }
  for (const m of text.matchAll(/\^([A-Z]{2,6})\b/g)) found.add("^" + m[1]);

  // 2) Company-name lookups via Yahoo search for capitalized multi-word phrases
  const phrases = new Set<string>();
  for (const m of text.matchAll(/\b([A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]+){0,3})\b/g)) phrases.add(m[1]);
  // Also try the whole user message as a single search (catches lowercase "apple", "nvidia")
  const cleaned = text.replace(/[^\w\s]/g, " ").trim();
  if (cleaned && cleaned.length < 60) phrases.add(cleaned);

  const lookups = Array.from(phrases).slice(0, 4).map((p) => searchSymbol(p));
  const resolved = await Promise.all(lookups);
  for (const s of resolved) if (s) found.add(s.toUpperCase());

  return Array.from(found).slice(0, 4);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require authenticated user
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const SB_URL = Deno.env.get("SUPABASE_URL")!;
    const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } } });
    const { data: uData, error: uErr } = await userClient.auth.getUser();
    if (uErr || !uData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages = [], context } = (await req.json()) as { messages: Msg[]; context?: any };
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY missing");

    // Use the last user turn to extract relevant tickers
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const candidates = lastUser ? await resolveCandidates(lastUser, context?.symbol) : (context?.symbol ? [context.symbol.toUpperCase()] : []);
    const stockBlocks = (await Promise.all(candidates.map((s) => gatherStockContext(s)))).filter(Boolean) as string[];

    const ctxLine = context
      ? `Current app state — route: ${context.path}; category: ${context.category}; symbol: ${context.symbol}; widgets: ${(context.widgets || []).join(",")}; watchlist: ${(context.watchlist || []).slice(0, 12).join(",")}.`
      : "";
    const liveBlock = stockBlocks.length
      ? `\n\n=== LIVE MARKET DATA (use these numbers) ===\n${stockBlocks.join("\n\n")}\n=== END LIVE DATA ===`
      : "";

    const system: Msg = { role: "system", content: SYSTEM + (ctxLine ? `\n\n${ctxLine}` : "") + liveBlock };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const callProvider = (url: string, apiKey: string, model: string) =>
      fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: [system, ...messages], stream: true }),
      });

    let aiRes = await callProvider("https://api.groq.com/openai/v1/chat/completions", GROQ_API_KEY, "llama-3.3-70b-versatile");

    if ((aiRes.status === 429 || aiRes.status === 402 || aiRes.status >= 500) && LOVABLE_API_KEY) {
      console.warn("groq unavailable", aiRes.status, "— falling back to Lovable AI");
      aiRes = await callProvider("https://ai.gateway.lovable.dev/v1/chat/completions", LOVABLE_API_KEY, "google/gemini-2.5-flash");
    }

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit, try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok || !aiRes.body) {
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI service is temporarily unavailable." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiRes.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
