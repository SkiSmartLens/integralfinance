const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const cache = new Map<string, { exp: number; body: string }>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { symbol, mode } = await req.json();
    if (!symbol || typeof symbol !== "string") {
      return new Response(JSON.stringify({ error: "symbol required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sym = symbol.toUpperCase();
    const isBeginner = mode === "beginner";
    const key = `sum:${isBeginner ? "b:" : ""}${sym}`;
    const hit = cache.get(key);
    if (hit && hit.exp > Date.now()) {
      return new Response(hit.body, {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

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
    const headlines: string[] = (newsJson?.news ?? [])
      .filter((n: any) => {
        const t = `${n.title ?? ""} ${n.summary ?? ""}`.toLowerCase();
        return needles.some((n) => t.includes(n));
      })
      .slice(0, 10)
      .map((n: any) => `- ${n.title} (${n.publisher})`);

    const beginnerPrompt = `Stock: ${companyName} (${sym})
Sector: ${q.sector ?? ""}  Industry: ${q.industry ?? ""}
Price: ${q.regularMarketPrice} ${q.currency ?? ""}
Mkt cap: ${q.marketCap}

Recent headlines about ${companyName} (${sym}):
${headlines.join("\n") || "(no recent headlines)"}

ONLY discuss ${companyName} (${sym}). Do NOT mention any other company. If a headline above is not about ${companyName}, ignore it.

Explain this company to a complete beginner who has never invested before.
Return strict JSON: {"whatItDoes": string, "whyPeopleBuy": string, "whatToWatch": string}
- whatItDoes: 1-2 plain-English sentences about ${companyName} specifically. Avoid jargon.
- whyPeopleBuy: 1-2 sentences on the bull case for ${companyName}.
- whatToWatch: 1-2 sentences on risks specific to ${companyName}.
No disclaimers, no markdown, no jargon.`;

    const analystPrompt = `Stock: ${companyName} (${sym})
Price: ${q.regularMarketPrice} ${q.currency ?? ""}
Change: ${q.regularMarketChangePercent?.toFixed?.(2)}%
Day range: ${q.regularMarketDayLow}-${q.regularMarketDayHigh}
52w range: ${q.fiftyTwoWeekLow}-${q.fiftyTwoWeekHigh}
Mkt cap: ${q.marketCap}
Trailing P/E: ${q.trailingPE ?? "?"}  Forward P/E: ${q.forwardPE ?? "?"}
EPS (ttm): ${q.epsTrailingTwelveMonths ?? "?"}  EPS fwd: ${q.epsForward ?? "?"}
Dividend yield: ${q.trailingAnnualDividendYield ?? q.dividendYield ?? "?"}
Avg analyst target: ${q.targetMeanPrice ?? "?"}  (low ${q.targetLowPrice ?? "?"} / high ${q.targetHighPrice ?? "?"})
Recommendation: ${q.averageAnalystRating ?? q.recommendationKey ?? "?"}

Recent headlines about ${companyName} (${sym}):
${headlines.join("\n") || "(no recent headlines)"}

CRITICAL: ONLY analyze ${companyName} (${sym}). Do NOT discuss any other ticker or company. Ignore any headline above that is not directly about ${companyName}.

Produce a DETAILED, in-depth analyst-grade summary. Be specific and quantitative where possible (cite numbers, % growth, margins, multiples). Avoid generic filler. Plain English, no disclaimers.

Return strict JSON with shape:
{
  "positives": [string],           // 4-6 detailed bullets, each 1-2 sentences with specifics
  "negatives": [string],           // 4-6 detailed bullets, each 1-2 sentences with specifics
  "revenueGrowth": string,         // 2-3 sentences on historical + expected revenue growth trajectory, cite YoY % if known
  "earningsGrowth": string,        // 2-3 sentences on EPS trend, beat/miss history, forward growth expectations
  "margins": string,               // 2-3 sentences on gross/operating/net margin quality vs peers
  "balanceSheet": string,          // 2-3 sentences on debt levels, cash position, leverage manageability
  "moat": string,                  // 2-3 sentences on competitive edge: brand, scale, network effects, switching costs, IP
  "earnings": string,              // 2-3 sentences on most recent + upcoming earnings event
  "forecast": string,              // 3-4 sentences: 12-month price/business outlook, analyst consensus, key catalysts to watch
  "outlook": string                // 2 sentence neutral synthesis
}`;


    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: isBeginner
              ? "You explain stocks to first-time investors in friendly plain English. Output only valid JSON."
              : "You are a concise equity research analyst writing for beginners. Output only valid JSON." },
          { role: "user", content: isBeginner ? beginnerPrompt : analystPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "stock_summary",
            description: "Return structured summary",
            parameters: isBeginner ? beginnerSchema : analystSchema,
          },
        }],
        tool_choice: { type: "function", function: { name: "stock_summary" } },
      }),
    });

    if (aiRes.status === 429) {
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
    const body = JSON.stringify(parsed);
    cache.set(key, { body, exp: Date.now() + 1000 * 60 * 30 });
    return new Response(body, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
