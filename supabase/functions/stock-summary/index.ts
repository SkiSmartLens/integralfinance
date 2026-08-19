const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const cache = new Map<string, { exp: number; body: string }>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Public endpoint: AI insights are readable by anyone (no sign-in required).


    const { symbol, mode } = await req.json();
    if (!symbol || typeof symbol !== "string") {
      return new Response(JSON.stringify({ error: "symbol required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sym = symbol.toUpperCase();
    const isBeginner = mode === "beginner";
    const key = `sum:v5:${isBeginner ? "b:" : ""}${sym}`;
    const hit = cache.get(key);
    if (hit && hit.exp > Date.now()) {
      return new Response(hit.body, {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "hit" },
      });
    }


    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY missing");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    // Fire the quote, the ticker news search and the web search all at once —
    // they don't depend on each other, so this cuts ~2 round trips of latency.
    const quotePromise = fetch(
      `${SUPABASE_URL}/functions/v1/yahoo-proxy?kind=quote&symbols=${sym}`,
      { headers: { apikey: anon } },
    ).then((r) => r.json()).catch(() => ({}));

    const newsPromise = fetch(
      `${SUPABASE_URL}/functions/v1/yahoo-proxy?kind=search&q=${encodeURIComponent(sym)}`,
      { headers: { apikey: anon } },
    ).then((r) => r.json()).catch(() => ({}));

    // Firecrawl web search — real, recent articles about why the stock moved,
    // plus a second pass for bull/bear/analyst-outlook material so the
    // positives/negatives bullets can be grounded and cited too.
    const fcSearch = (query: string, tbs?: string) =>
      FIRECRAWL_API_KEY
        ? fetch("https://api.firecrawl.dev/v2/search", {
            method: "POST",
            headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              query,
              limit: 5,
              ...(tbs ? { tbs } : {}),
              scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
            }),
          }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
        : Promise.resolve(null);

    const firecrawlPromise = fcSearch(`${sym} stock why it moved today news`, "qdr:w");
    const firecrawlCasePromise = fcSearch(`${sym} stock bull case bear case analyst outlook`, "qdr:m");



    const quoteJson: any = await quotePromise;
    const q = quoteJson?.quoteResponse?.result?.[0] ?? {};
    const companyName: string = q.longName || q.shortName || sym;

    const newsJson: any = await newsPromise;



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

    // 3) Real web research (Firecrawl, started in parallel above): actual article
    //    text about why the stock moved, plus citable sources for the UI.
    let webContext = "";
    const webSources: { title: string; publisher: string; url: string }[] = [];
    try {
      const [fc, fcCase]: any[] = await Promise.all([firecrawlPromise, firecrawlCasePromise]);
      const pick = (x: any): any[] => x?.data?.web ?? x?.web ?? (Array.isArray(x?.data) ? x.data : []) ?? [];
      const results: any[] = [...pick(fc).slice(0, 5), ...pick(fcCase).slice(0, 4)];
      const lines: string[] = [];
      const seen = new Set<string>();
      for (const r of results) {
        const title = (r.title ?? "").toString().trim();
        const url = (r.url ?? "").toString();
        if (!title || !url || seen.has(url)) continue;
        seen.add(url);
        let host = "";
        try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
        const body = (r.markdown ?? r.description ?? r.snippet ?? "")
          .toString()
          .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
          .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 1400);
        const n = webSources.length + 1;
        webSources.push({ title, publisher: host || "web", url });
        lines.push(`[${n}] ${title} — ${host}\n${body}`);
      }
      if (lines.length) webContext = lines.join("\n\n");
    } catch (e) {
      console.warn("firecrawl error", e instanceof Error ? e.message : e);
    }

    const webBlock = webContext
      ? `\n\nRESEARCH — real, recently published articles about ${companyName} (${sym}), fetched from the live web. These are the SOURCE OF TRUTH for "whyMoved", "positives" and "negatives":\n${webContext}\n\nWhen you use a fact from an article above, append its bracket number (e.g. [1], [2]) to that sentence or bullet. Never cite a number that is not listed above. Do not invent facts that are not in these articles.\n`
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
- If a RESEARCH article above is provided, whyMoved MUST be built from it and MUST include at least one bracket citation like [1]. Name the actual catalyst and the reported number (earnings, guidance, analyst action, product/legal/macro event) as reported.
- Never state a catalyst that is not supported by the research or headlines above. If the research is thin, say what IS known and then explain the rest from the structural data.
- If they do NOT give a concrete catalyst, explain the move from the STRUCTURAL data above. Call out whichever apply and cite the numbers: extreme under- or over-performance vs the 52-week range, severe unprofitability (negative EPS, negative operating/profit margins), lack of institutional backing (low heldPercentInstitutions), heavy debt load (high debtToEquity / totalDebt), or high volatility (beta well above 1, wide day range). Tie those structural facts to why the price is reacting the way it is today.
- 3-5 sentences. Concrete numbers, not adjectives.
HARD RULES for positives and negatives (violating these is a failure):
- Every bullet MUST be grounded in EITHER (a) a RESEARCH article / headline above, or (b) the structural quote data above (valuation, margins, EPS, debt, growth, beta, institutional ownership, 52-week range, analyst target). NEVER invent a claim from general knowledge or memory.
- When a bullet draws on a RESEARCH article, it MUST end with that article's bracket citation (e.g. [1], [2]), using the SAME numbering as whyMoved. Never cite a number that is not listed above.
- When there is not enough research to support a specific bullish or bearish claim, do NOT guess: fall back explicitly to the structural financial data above and cite the actual figure (e.g. "Forward P/E of 18.4 vs trailing 24.1 implies expected earnings growth", "Debt/Equity of 162 leaves little cushion").
- No generic filler ("strong brand", "faces competition", "macro uncertainty") unless it is tied to a cited article or a specific number above.
- 4-6 bullets each, 1-2 sentences, concrete numbers over adjectives.


Return strict JSON with shape:
{
  "whyMoved": string,              // 3-5 sentences, follow the HARD RULES above.
  "whatItDoes": string,            // 1-2 sentences on the company's business — what they actually sell/do and where their revenue comes from. Required.
  "positives": [string],           // 4-6 detailed bullets, grounded + cited per the HARD RULES above
  "negatives": [string],           // 4-6 detailed bullets, grounded + cited per the HARD RULES above

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

    // Primary: Groq, then a second Groq model (separate rate-limit bucket),
    // then Lovable AI gateway as the last resort.
    const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    let aiRes = await callProvider(GROQ_URL, GROQ_API_KEY, "llama-3.1-8b-instant");

    // 404/400 = model decommissioned or request rejected by Groq → also fall through.
    const groqUnavailable = (r: Response) =>
      r.status === 429 || r.status === 402 || r.status === 404 || r.status === 400 || r.status >= 500;

    if (groqUnavailable(aiRes)) {
      console.warn("groq primary unavailable", aiRes.status, (await aiRes.clone().text()).slice(0, 500));
      aiRes = await callProvider(GROQ_URL, GROQ_API_KEY, "openai/gpt-oss-120b");
    }

    if (groqUnavailable(aiRes) && LOVABLE_API_KEY) {
      console.warn("groq unavailable", aiRes.status, (await aiRes.clone().text()).slice(0, 300), "— falling back to Lovable AI");
      aiRes = await callProvider("https://ai.gateway.lovable.dev/v1/chat/completions", LOVABLE_API_KEY, "google/gemini-3.6-flash");
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
    // Attach citations: researched web articles first (these are what whyMoved's
    // [1], [2] markers refer to), then the remaining ticker headlines.
    const seen = new Set<string>();
    parsed.sources = [...webSources, ...sources].filter((s: any) => {
      if (!s?.url || seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    }).slice(0, 10);
    parsed.grounded = webSources.length > 0;

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
