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
    // Pull news + quote via our own proxy
    const [newsRes, quoteRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/functions/v1/yahoo-proxy?kind=search&q=${encodeURIComponent(sym)}`, {
        headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "" },
      }),
      fetch(`${SUPABASE_URL}/functions/v1/yahoo-proxy?kind=quote&symbols=${sym}`, {
        headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "" },
      }),
    ]);
    const newsJson = await newsRes.json().catch(() => ({}));
    const quoteJson = await quoteRes.json().catch(() => ({}));
    const headlines: string[] = (newsJson?.news ?? [])
      .slice(0, 12)
      .map((n: any) => `- ${n.title} (${n.publisher})`);
    const q = quoteJson?.quoteResponse?.result?.[0] ?? {};

    const beginnerPrompt = `Stock: ${q.shortName ?? sym} (${sym})
Sector: ${q.sector ?? ""}  Industry: ${q.industry ?? ""}
Price: ${q.regularMarketPrice} ${q.currency ?? ""}
Mkt cap: ${q.marketCap}

Recent headlines:
${headlines.join("\n") || "(none)"}

Explain this company to a complete beginner who has never invested before.
Return strict JSON: {"whatItDoes": string, "whyPeopleBuy": string, "whatToWatch": string}
- whatItDoes: 1-2 plain-English sentences. Avoid jargon. Imagine explaining to a teenager.
- whyPeopleBuy: 1-2 sentences on the bull case (growth, dividends, brand, etc.).
- whatToWatch: 1-2 sentences on key risks or what could move the price.
No disclaimers, no markdown, no jargon.`;

    const analystPrompt = `Stock: ${q.shortName ?? sym} (${sym})
Price: ${q.regularMarketPrice} ${q.currency ?? ""}
Change: ${q.regularMarketChangePercent?.toFixed?.(2)}%
Day range: ${q.regularMarketDayLow}-${q.regularMarketDayHigh}
52w range: ${q.fiftyTwoWeekLow}-${q.fiftyTwoWeekHigh}
Mkt cap: ${q.marketCap}

Recent headlines:
${headlines.join("\n") || "(none)"}

Return strict JSON with shape:
{"positives":[string], "negatives":[string], "earnings": string, "outlook": string}
- 3-5 short bullets each. Use simple language a beginner can understand — no jargon.
- earnings: 1-2 sentences on most recent / upcoming earnings if known
- outlook: 1 sentence neutral synthesis
Be concise, no disclaimers.`;

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
        positives: { type: "array", items: { type: "string" } },
        negatives: { type: "array", items: { type: "string" } },
        earnings: { type: "string" },
        outlook: { type: "string" },
      },
      required: ["positives", "negatives", "earnings", "outlook"],
    };

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
