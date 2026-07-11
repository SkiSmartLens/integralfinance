import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const cache = new Map<string, { exp: number; body: string }>();

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

    const { symbol, mode } = await req.json();
    if (!symbol || typeof symbol !== "string") {
      return new Response(JSON.stringify({ error: "symbol required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sym = symbol.toUpperCase();
    const isBeginner = mode === "beginner";
    const key = `sum:v4:${isBeginner ? "b:" : ""}${sym}`;
    const hit = cache.get(key);
    if (hit && hit.exp > Date.now()) {
      return new Response(hit.body, {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY missing");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // 1) Get the quote first so we have the real company name.
    const quoteRes = await fetch(
      `${SUPABASE_URL}/functions/v1/yahoo-proxy?kind=quote&symbols=${sym}`,
      { headers: { apikey: anon } },
    );
    const quoteJson = await quoteRes.json().catch(() => ({}));
    const q = quoteJson?.quoteResponse?.result?.[0] ?? {};
    const companyName: string = q.longName || q.shortName || sym;

    // 2) Search news using the actual company name (much more relevant
    //    than searching by ticker, especially for indices/ETFs).
    const newsQuery = `${companyName} ${sym}`;
    const newsRes = await fetch(
      `${SUPABASE_URL}/functions/v1/yahoo-proxy?kind=search&q=${encodeURIComponent(newsQuery)}`,
      { headers: { apikey: anon } },
    );
    const newsJson = await newsRes.json().catch(() => ({}));

    // Filter headlines to ones that actually mention the ticker or a
    // distinctive word from the company name — drops unrelated noise.
    const nameWords = companyName
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 4 && !/^(inc|corp|corporation|company|the|and|group|holdings|ltd|plc|index|fund|etf|trust)$/i.test(w));
    const needles = [sym.toLowerCase(), ...nameWords.map((w) => w.toLowerCase())];
    // Keep the raw filtered news items so we can build a sources array to send
    // to the client for citation UI, alongside the plain-text list for the prompt.
    const filteredNews = (newsJson?.news ?? []).filter((n: any) => {
      const t = `${n.title ?? ""} ${n.summary ?? ""}`.toLowerCase();
      return needles.some((n) => t.includes(n));
    });
    const headlines: string[] = filteredNews
      .slice(0, 10)
      .map((n: any) => `- ${n.title} (${n.publisher})`);
    const sources = filteredNews.slice(0, 6).map((n: any) => ({
      title: n.title as string,
      publisher: n.publisher as string,
      url: (n.link as string) ?? (n.url as string) ?? "",
    }));

    // 3) Google the actual reason the stock moved today via Firecrawl web search.
    //    We feed these real, dated results to the model so the "why moved"
    //    explanation reflects what actually happened — not an invented reason.
    let webContext = "";
    const changePct = typeof q.regularMarketChangePercent === "number" ? q.regularMarketChangePercent : undefined;
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (FIRECRAWL_API_KEY) {
      try {
        const dir = changePct == null ? "move" : changePct >= 0 ? "rise / go up" : "fall / drop";
        const searchQuery = `Why did ${companyName} (${sym}) stock ${dir} today`;
        const fcRes = await fetch("https://api.firecrawl.dev/v2/search", {
          method: "POST",
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ query: searchQuery, limit: 6 }),
        });
        if (fcRes.ok) {
          const fc = await fcRes.json().catch(() => ({}));
          const results: any[] = fc?.data?.web ?? fc?.web ?? (Array.isArray(fc?.data) ? fc.data : []) ?? [];
          const lines = results
            .map((r: any) => {
              const title = r.title ?? "";
              const snippet = (r.description ?? r.snippet ?? "").toString().slice(0, 300);
              const src = r.url ? new URL(r.url).hostname.replace(/^www\./, "") : "";
              return title ? `- ${title}${snippet ? `: ${snippet}` : ""}${src ? ` (${src})` : ""}` : "";
            })
            .filter(Boolean)
            .slice(0, 6);
          if (lines.length) webContext = lines.join("\n");
        } else {
          console.warn("firecrawl search failed", fcRes.status);
        }
      } catch (e) {
        console.warn("firecrawl error", e instanceof Error ? e.message : e);
      }
    }
    const webBlock = webContext
      ? `\n\nWeb search results (Google) for why ${companyName} (${sym}) moved today — use these as the SOURCE OF TRUTH for the "whyMoved" field:\n${webContext}\n`
      : "";

    const beginnerPrompt = `Stock: ${companyName} (${sym})
Sector: ${q.sector ?? ""}  Industry: ${q.industry ?? ""}
Price: ${q.regularMarketPrice} ${q.currency ?? ""}
Mkt cap: ${q.marketCap}

Recent headlines about ${companyName} (${sym}):
${headlines.join("\n") || "(no recent headlines)"}

ONLY discuss ${companyName} (${sym}). Do NOT name ANY other company, ticker, or specific holding — not even as an example, not even if this is an index, ETF, or fund. Describe holdings only in generic categories (e.g. "large US tech companies", "energy producers"). If a headline above is not about ${companyName}, ignore it.

Explain ${companyName} to a complete beginner who has never invested before.
Return strict JSON: {"whatItDoes": string, "whyPeopleBuy": string, "whatToWatch": string}
- whatItDoes: 1-2 plain-English sentences about ${companyName} specifically. Avoid jargon. No other company names.
- whyPeopleBuy: 1-2 sentences on the bull case for ${companyName}. No other company names.
- whatToWatch: 1-2 sentences on risks specific to ${companyName}. No other company names.
No disclaimers, no markdown, no jargon.`;

    const analystPrompt = `Stock: ${companyName} (${sym})
Sector: ${q.sector ?? "?"}  Industry: ${q.industry ?? "?"}
Price: ${q.regularMarketPrice} ${q.currency ?? ""}
Change: ${q.regularMarketChangePercent?.toFixed?.(2)}%
Day range: ${q.regularMarketDayLow}-${q.regularMarketDayHigh}
52w range: ${q.fiftyTwoWeekLow}-${q.fiftyTwoWeekHigh}
Mkt cap: ${q.marketCap}
Trailing P/E: ${q.trailingPE ?? "?"}  Forward P/E: ${q.forwardPE ?? "?"}
EPS (ttm): ${q.epsTrailingTwelveMonths ?? "?"}  EPS fwd: ${q.epsForward ?? "?"}
Profit margin: ${q.profitMargins ?? q.netMargins ?? "?"}  Operating margin: ${q.operatingMargins ?? "?"}
Debt/Equity: ${q.debtToEquity ?? "?"}  Total debt: ${q.totalDebt ?? "?"}
Beta: ${q.beta ?? "?"}  Avg vol: ${q.averageDailyVolume10Day ?? q.averageVolume ?? "?"}
Held by institutions %: ${q.heldPercentInstitutions ?? "?"}
52w change vs price: low ${q.fiftyTwoWeekLow ?? "?"} / high ${q.fiftyTwoWeekHigh ?? "?"}
Dividend yield: ${q.trailingAnnualDividendYield ?? q.dividendYield ?? "?"}
Avg analyst target: ${q.targetMeanPrice ?? "?"}  (low ${q.targetLowPrice ?? "?"} / high ${q.targetHighPrice ?? "?"})
Recommendation: ${q.averageAnalystRating ?? q.recommendationKey ?? "?"}

Recent headlines about ${companyName} (${sym}):
${headlines.join("\n") || "(no recent headlines)"}
${webBlock}
CRITICAL: ONLY analyze ${companyName} (${sym}). Do NOT discuss any other ticker or company. Ignore any headline above that is not directly about ${companyName}.

Produce a DETAILED, in-depth analyst-grade summary. Be specific and quantitative — cite the actual numbers above (% change, margins, P/E, EPS, debt levels, beta, institutional ownership). Plain English, no disclaimers.

HARD RULES for whyMoved (violating these is a failure):
- NEVER say "broad market action", "no recent headlines", "no news", "market sentiment", "general market conditions", or any similar filler.
- If the web search / headlines above give a concrete company-specific catalyst, summarize it in plain English (earnings, guidance, analyst rating change, product/legal/macro news) with the reported number.
- If they do NOT give a concrete catalyst, explain the move from the STRUCTURAL data above. Call out whichever apply and cite the numbers: extreme under- or over-performance vs the 52-week range, severe unprofitability (negative EPS, negative operating/profit margins), lack of institutional backing (low heldPercentInstitutions), heavy debt load (high debtToEquity / totalDebt), or high volatility (beta well above 1, wide day range). Tie those structural facts to why the price is reacting the way it is today.
- 3-5 sentences. Concrete numbers, not adjectives.

Return strict JSON with shape:
{
  "whyMoved": string,              // 3-5 sentences, follow the HARD RULES above.
  "whatItDoes": string,            // 1-2 sentences on the company's business — what they actually sell/do and where their revenue comes from. Required.
  "positives": [string],           // 4-6 detailed bullets, each 1-2 sentences with specifics
  "negatives": [string],           // 4-6 detailed bullets, each 1-2 sentences with specifics
  "predictedRevenue": string,      // a CONCRETE estimated next-fiscal-year TOTAL revenue figure as a dollar amount (e.g. "~$412B" or "~$8.5B"). Base it on the latest reported revenue and the expected growth rate. ALWAYS give a specific number, not a range of words. If genuinely unknown, give your best quantitative estimate and note it is approximate.
  "revenueGrowth": string,         // 2-3 sentences on historical + expected revenue growth trajectory, cite YoY % if known
  "earningsGrowth": string,        // 2-3 sentences on EPS trend, beat/miss history, forward growth expectations
  "margins": string,               // 2-3 sentences on gross/operating/net margin quality vs peers
  "balanceSheet": string,          // 2-3 sentences on debt levels (cite debtToEquity / totalDebt above), cash position, and leverage manageability. Do not hand-wave — mention the actual debt figure.
  "moat": string,                  // 2-3 sentences on competitive edge: brand, scale, network effects, switching costs, IP
  "earnings": string,              // 2-3 sentences on most recent + upcoming earnings event
  "forecast": string,              // 3-4 sentences: 12-month price/business outlook, analyst consensus, key catalysts to watch
  "outlook": string                // 2 sentence neutral synthesis
}`;

    const beginnerSchema = {
      type: "object",
      properties: {
        whatItDoes: { type: "string" },
        whyPeopleBuy: { type: "string" },
        whatToWatch: { type: "string" },
      },
      required: ["whatItDoes", "whyPeopleBuy", "whatToWatch"],
    };
    const analystSchema = {
      type: "object",
      properties: {
        whyMoved: { type: "string" },
        whatItDoes: { type: "string" },
        positives: { type: "array", items: { type: "string" } },
        negatives: { type: "array", items: { type: "string" } },
        predictedRevenue: { type: "string" },
        revenueGrowth: { type: "string" },
        earningsGrowth: { type: "string" },
        margins: { type: "string" },
        balanceSheet: { type: "string" },
        moat: { type: "string" },
        earnings: { type: "string" },
        forecast: { type: "string" },
        outlook: { type: "string" },
      },
      required: ["whyMoved", "whatItDoes", "positives", "negatives", "predictedRevenue", "revenueGrowth", "earningsGrowth", "margins", "balanceSheet", "moat", "earnings", "forecast", "outlook"],
    };



    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const messages = [
      { role: "system", content: isBeginner
          ? "You explain stocks to first-time investors in friendly plain English. Output only valid JSON."
          : "You are a concise equity research analyst writing for beginners. Output only valid JSON." },
      { role: "user", content: isBeginner ? beginnerPrompt : analystPrompt },
    ];
    const tools = [{
      type: "function",
      function: {
        name: "stock_summary",
        description: "Return structured summary",
        parameters: isBeginner ? beginnerSchema : analystSchema,
      },
    }];
    const tool_choice = { type: "function", function: { name: "stock_summary" } };

    const callProvider = (url: string, apiKey: string, model: string) =>
      fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, tools, tool_choice }),
      });

    // Primary: Groq. Fallback: Lovable AI gateway when Groq is rate-limited/over quota.
    let aiRes = await callProvider("https://api.groq.com/openai/v1/chat/completions", GROQ_API_KEY, "llama-3.3-70b-versatile");

    if ((aiRes.status === 429 || aiRes.status === 402 || aiRes.status >= 500) && LOVABLE_API_KEY) {
      console.warn("groq unavailable", aiRes.status, "— falling back to Lovable AI");
      aiRes = await callProvider("https://ai.gateway.lovable.dev/v1/chat/completions", LOVABLE_API_KEY, "google/gemini-2.5-flash");
    }

    if (aiRes.status === 429) {
      const t = await aiRes.text();
      console.error("ai 429", t);
      return new Response(JSON.stringify({ error: "Rate limit, try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("ai err", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: any = {};
    try { parsed = JSON.parse(args ?? "{}"); } catch { parsed = {}; }
    if (!isBeginner) {
      const fallback = `No specific data available for ${companyName}. This may apply more to individual operating companies than to indices, ETFs, or funds.`;
      for (const f of ["whyMoved", "whatItDoes", "predictedRevenue", "revenueGrowth", "earningsGrowth", "margins", "balanceSheet", "moat", "earnings", "forecast", "outlook"]) {
        if (!parsed[f] || typeof parsed[f] !== "string" || !parsed[f].trim()) parsed[f] = fallback;
      }
      if (!Array.isArray(parsed.positives) || !parsed.positives.length) parsed.positives = ["Analysis unavailable right now."];
      if (!Array.isArray(parsed.negatives) || !parsed.negatives.length) parsed.negatives = ["Analysis unavailable right now."];
    }
    // Attach real headline sources so the UI can render citations.
    parsed.sources = sources;
    const body = JSON.stringify(parsed);
    cache.set(key, { body, exp: Date.now() + 1000 * 60 * 30 });
    return new Response(body, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Could not generate summary. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
