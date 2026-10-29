const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Msg { role: "user" | "assistant" | "system"; content: string }

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const SYSTEM = `You are Integral, the live AI guide for Integral Stocks.

You can BOTH talk to the user AND take actions in the app for them. You can answer ANY question about ANY publicly traded stock, ETF, index, crypto, or FX pair. The user's request will be enriched below with LIVE market data (quotes, key stats, recent news) for any tickers/companies they mentioned — USE THAT DATA in your answer. Quote whatever numbers, dates, and headlines are relevant.

Most users are beginners and students. Explain any jargon in a few plain words the first time you use it, and lead with the answer before the detail.

Where facts come from:
- Anything current (prices, today's move, recent results, news, upcoming earnings) must come from the LIVE MARKET DATA and RECENT ARTICLES blocks below. The "SEC filings" lines there are the company's own reported results, so prefer them for revenue, profit, margins, cash and debt.
- General knowledge is fine for background that doesn't go stale: what a company does, its history, how an investing concept works.
- Never state a current figure (a price, a margin, an analyst target, a growth rate) that isn't in the data below. If the user needs one you don't have, say so in one short sentence and answer with what you do have. Don't refuse a reasonable question.

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
- Use markdown sparingly (bold for headlines, lists for multi-point answers).

DECISION COACHING (buy / sell / hold questions):
When the user asks something like "should I sell my Moderna stock?", do ALL of this, in this order:
1. **What the news says** — 3-5 short bullets summarizing the RECENT ARTICLES block in plain English. Every bullet ends with a bracketed citation like [1] pointing at the numbered article you used. Never invent a fact that is not in the articles or the live data.
2. **Where the stock stands** — 2-3 bullets with real numbers from the live data (price, % change, 52-week range, valuation, analyst target).
3. **Questions for you** — ask exactly 3 short, concrete questions whose answers would change the decision (e.g. how long do you plan to hold, are you up or down on the position and by how much, what % of your portfolio is it, would you buy it again today, do you have a target price or a loss you'd accept). Number them 1-3 and stop there.
4. **How I'd think about it** — after the user answers those questions, in the NEXT turn give a clear, decisive recommendation framework: what a long-term holder would likely do vs. what a short-term trader would do, the key risk to watch, and the specific signal that would change the answer.
NEVER invent prices, dates, headlines, or article facts. If the LIVE MARKET DATA or RECENT ARTICLES blocks are missing or empty for the ticker asked about, say plainly that you could not pull fresh data right now and ask the user to confirm the ticker instead of guessing numbers.
Never say "I can't give financial advice" and never add a disclaimer paragraph — be a helpful, honest coach who explains reasoning, cites sources, and reminds the user the final call is theirs in at most one short sentence.
If a "Sources" section helps, list the cited articles at the end as [n] Title — publisher, with the URL.
- Keep answers scannable: short bullets, bold mini-headers, no walls of text.`;


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

const SB_URL_ENV = Deno.env.get("SUPABASE_URL") ?? "";
const SB_ANON_ENV = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// Yahoo blocks a lot of direct datacenter traffic — go through our own proxy
// (which handles crumbs/cookies/caching) and only use direct calls as a backup.
async function pfetch(qs: string): Promise<any | null> {
  if (!SB_URL_ENV) return null;
  try {
    const r = await fetch(`${SB_URL_ENV}/functions/v1/yahoo-proxy?${qs}`, { headers: { apikey: SB_ANON_ENV } });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

async function searchSymbol(term: string): Promise<string | null> {
  const j = (await pfetch(`kind=search&q=${encodeURIComponent(term)}&quotesCount=5&newsCount=0`))
    ?? (await yfetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(term)}&quotesCount=5&newsCount=0`));
  const hit = j?.quotes?.find((q: any) => q?.symbol && (q.quoteType === "EQUITY" || q.quoteType === "ETF" || q.quoteType === "CRYPTOCURRENCY" || q.quoteType === "INDEX" || q.quoteType === "CURRENCY")) ?? j?.quotes?.[0];
  return hit?.symbol ?? null;
}

async function quoteFor(symbol: string): Promise<any | null> {
  const j = (await pfetch(`kind=quote&symbols=${encodeURIComponent(symbol)}`))
    ?? (await yfetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`));
  return j?.quoteResponse?.result?.[0] ?? null;
}

function fmt(n: any, d = 2): string {
  if (n == null || typeof n !== "number" || !isFinite(n)) return "—";
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
  return n.toFixed(d);
}

/** Revenue, margins, debt and cash from the company's SEC filings (via yahoo-proxy). Empty for funds, crypto, non-US. */
async function fundamentalsFor(symbol: string): Promise<string[]> {
  const j = await pfetch(`kind=fundamentals&symbol=${encodeURIComponent(symbol)}`);
  return Array.isArray(j?.lines) ? j.lines : [];
}

async function gatherStockContext(symbol: string): Promise<{ name: string; block: string } | null> {
  const sym = symbol.toUpperCase();
  const [q, filings] = await Promise.all([quoteFor(sym), fundamentalsFor(sym)]);
  if (!q && !filings.length) return null;
  const name = q?.longName || q?.shortName || sym;

  // Only figures we actually have, so the model has nothing to fill in.
  const lines: string[] = [`### ${name} (${sym})`];
  if (q?.regularMarketPrice != null) {
    lines.push(`Price: ${fmt(q.regularMarketPrice)} ${q.currency ?? ""} · Change today: ${fmt(q.regularMarketChange)} (${fmt(q.regularMarketChangePercent)}%) · Day range: ${fmt(q.regularMarketDayLow)}–${fmt(q.regularMarketDayHigh)} · 52-week range: ${fmt(q.fiftyTwoWeekLow)}–${fmt(q.fiftyTwoWeekHigh)}`);
  }
  const valuation = [
    q?.marketCap && `Market cap: ${fmt(q.marketCap)}`,
    q?.trailingPE && `P/E (trailing): ${fmt(q.trailingPE)}`,
    q?.forwardPE && `P/E (forward): ${fmt(q.forwardPE)}`,
    q?.epsTrailingTwelveMonths && `EPS (trailing 12 months): ${fmt(q.epsTrailingTwelveMonths)}`,
    q?.dividendYield && `Dividend yield: ${fmt(q.dividendYield)}%`,
  ].filter(Boolean);
  if (valuation.length) lines.push(valuation.join(" · "));
  const ts = q?.earningsTimestampStart ?? q?.earningsTimestamp;
  // Yahoo keeps the last report's date until the next one is scheduled.
  if (ts) lines.push(`${ts * 1000 > Date.now() ? "Next" : "Last"} earnings report: ${new Date(ts * 1000).toDateString()}`);
  if (filings.length) lines.push(`From its SEC filings:\n${filings.map((l) => `- ${l}`).join("\n")}`);
  return { name, block: lines.join("\n") };
}


// ---- Real article research: recent Yahoo Finance / web articles about a ticker ----
export interface Article { title: string; publisher: string; url: string; text: string; date?: string }

async function yahooArticles(symbol: string): Promise<Article[]> {
  const j = (await pfetch(`kind=search&q=${encodeURIComponent(symbol)}&quotesCount=0&newsCount=10`))
    ?? (await yfetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=0&newsCount=10`));
  const items: any[] = j?.news ?? [];
  return items.slice(0, 8).map((n) => ({
    title: String(n?.title ?? ""),
    publisher: String(n?.publisher ?? "Yahoo Finance"),
    url: String(n?.link ?? ""),
    text: String(n?.summary ?? ""),
    date: n?.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString().slice(0, 10) : undefined,
  })).filter((a) => a.title && a.url);
}

async function firecrawlArticles(symbol: string, name: string): Promise<Article[]> {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  if (!key) return [];
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `${name || symbol} (${symbol}) stock news analysis should I buy or sell`,
        limit: 5,
        tbs: "qdr:w",
        scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      }),
    });
    if (!r.ok) return [];
    const j: any = await r.json();
    const pick = (x: any): any[] => x?.data?.web ?? x?.web ?? (Array.isArray(x?.data) ? x.data : []) ?? [];
    return pick(j).slice(0, 5).map((x: any) => ({
      title: String(x?.title ?? ""),
      publisher: (() => { try { return new URL(String(x?.url)).hostname.replace(/^www\./, ""); } catch { return "web"; } })(),
      url: String(x?.url ?? ""),
      text: String(x?.markdown ?? x?.description ?? "").replace(/\s+/g, " ").slice(0, 1800),
    })).filter((a: Article) => a.title && a.url);
  } catch { return []; }
}

/** Stories from the site's news feeds (CNBC, Fox Business, IBD, ...), with article text where the feed has it. */
async function feedArticles(symbol: string, name: string): Promise<Article[]> {
  const j = await pfetch(`kind=news&limit=6&q=${encodeURIComponent(symbol)}&name=${encodeURIComponent(name)}`);
  return ((j?.stories ?? []) as { title: string; publisher: string; url: string; published: number; summary: string; text: string }[]).map((st) => ({
    title: st.title,
    publisher: st.publisher,
    url: st.url,
    text: st.text || st.summary,
    date: st.published ? new Date(st.published * 1000).toISOString().slice(0, 10) : undefined,
  }));
}

async function gatherArticles(symbol: string, name: string): Promise<Article[]> {
  const [feeds, yh, fc] = await Promise.all([feedArticles(symbol, name), yahooArticles(symbol), firecrawlArticles(symbol, name)]);
  const out: Article[] = [];
  const seen = new Set<string>();
  // Stories with text first: the model can only summarize what it can read.
  for (const a of [...feeds, ...fc, ...yh]) {
    if (seen.has(a.url)) continue;
    seen.add(a.url);
    out.push(a);
    if (out.length >= 8) break;
  }
  return out;
}

async function resolveCandidates(text: string, contextSymbol?: string): Promise<string[]> {
  const found = new Set<string>();

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
  // Also try the message with filler words removed — this is what catches
  // lowercase company names like "should i sell my moderna stock" -> "moderna".
  const FILLER = new Set(["should","i","my","me","we","you","the","a","an","is","it","do","does","did","can","could","would","will","sell","buy","hold","stock","stocks","share","shares","price","now","today","about","of","in","on","for","to","and","or","what","whats","why","how","tell","think","good","bad","time","right","this","that","any","more","tho","please","thanks","invest","investing","worth","still","keep","get","rid"]);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const keep = words.filter((w) => !FILLER.has(w) && w.length >= 3);
  if (keep.length) phrases.add(keep.join(" "));
  for (const w of keep.slice(0, 3)) phrases.add(w);
  const cleaned = text.replace(/[^\w\s]/g, " ").trim();
  if (cleaned && cleaned.length < 60) phrases.add(cleaned);

  const lookups = Array.from(phrases).slice(0, 6).map((p) => searchSymbol(p));
  const resolved = await Promise.all(lookups);
  for (const s of resolved) if (s) found.add(s.toUpperCase());
  // The stock on the page the user is looking at comes after anything they
  // named, so "should I sell Tesla?" asked from Apple's page is about Tesla.
  if (contextSymbol) found.add(contextSymbol.toUpperCase());

  return Array.from(found).slice(0, 4);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Public endpoint: anyone can ask Integral AI (no sign-in required).
    const { messages = [], context } = (await req.json()) as { messages: Msg[]; context?: any };
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY missing");

    // Use the last user turn to extract relevant tickers
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const candidates = lastUser ? await resolveCandidates(lastUser, context?.symbol) : (context?.symbol ? [context.symbol.toUpperCase()] : []);
    const stocks = await Promise.all(candidates.map((s) => gatherStockContext(s)));
    const stockBlocks = stocks.filter(Boolean).map((x) => x!.block);

    // Read what recent articles actually say about the ticker(s) in question.
    const articleLists = await Promise.all(candidates.slice(0, 2).map((s, i) => gatherArticles(s, stocks[i]?.name ?? "")));
    // Most of the room goes to the first company (the one asked about).
    const allArticles = [...(articleLists[0] ?? []).slice(0, 7), ...(articleLists[1] ?? []).slice(0, 3)];
    const researchBlock = allArticles.length
      ? `\n\n=== RECENT ARTICLES (read these, summarize what they say, cite as [1], [2]...) ===\n` +
        allArticles.map((a, i) => `[${i + 1}] ${a.title} — ${a.publisher}${a.date ? ` (${a.date})` : ""}\n${a.url}\n${a.text ? a.text.slice(0, 1200) : "(headline only)"}`).join("\n\n") +
        `\n=== END ARTICLES ===`
      : "";

    const ctxLine = context
      ? `Current app state — route: ${context.path}; category: ${context.category}; symbol: ${context.symbol}; widgets: ${(context.widgets || []).join(",")}; watchlist: ${(context.watchlist || []).slice(0, 12).join(",")}.`
      : "";
    const liveBlock = stockBlocks.length
      ? `\n\n=== LIVE MARKET DATA (use these numbers) ===\n${stockBlocks.join("\n\n")}\n=== END LIVE DATA ===`
      : "";

    const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "America/New_York" });
    const system: Msg = {
      role: "system",
      content: SYSTEM + `\n\nToday is ${today} (US Eastern time).` + (ctxLine ? `\n\n${ctxLine}` : "") + liveBlock + researchBlock,
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const callProvider = (url: string, apiKey: string, model: string) =>
      fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [system, ...messages],
          stream: true,
          // gpt-oss thinks before answering (streamed separately, so users only
          // see the answer); medium is a good trade between depth and wait.
          ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: "medium" } : {}),
        }),
      });

    const groqUnavailable = (r: Response) => r.status === 429 || r.status === 402 || r.status === 404 || r.status === 400 || r.status >= 500;

    // Strongest first; each Groq model has its own rate limit, so a busy one
    // falls through to the next instead of failing.
    const GROQ = "https://api.groq.com/openai/v1/chat/completions";
    let aiRes = await callProvider(GROQ, GROQ_API_KEY, "openai/gpt-oss-120b");
    for (const model of ["openai/gpt-oss-20b", "llama-3.1-8b-instant"]) {
      if (!groqUnavailable(aiRes)) break;
      console.warn("groq model unavailable", aiRes.status, (await aiRes.clone().text()).slice(0, 300), "— trying", model);
      aiRes = await callProvider(GROQ, GROQ_API_KEY, model);
    }
    // Backup Groq key: used only when the main key is exhausted/unavailable.
    const GROQ_KEY_2 = Deno.env.get("Groq_API_Key_2");
    if (GROQ_KEY_2) {
      for (const model of ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.1-8b-instant"]) {
        if (!groqUnavailable(aiRes)) break;
        console.warn("groq key 1 unavailable", aiRes.status, "— trying Groq key 2 with", model);
        aiRes = await callProvider(GROQ, GROQ_KEY_2, model);
      }
    }

    if (groqUnavailable(aiRes) && LOVABLE_API_KEY) {
      console.warn("groq unavailable", aiRes.status, "— falling back to Lovable AI");
      aiRes = await callProvider("https://ai.gateway.lovable.dev/v1/chat/completions", LOVABLE_API_KEY, "google/gemini-2.5-flash");
    }


    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit, try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "Too many requests right now. Please try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
