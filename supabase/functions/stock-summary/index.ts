import { corsHeaders } from "@supabase/supabase-js/cors";

const cache = new Map<string, { exp: number; body: string }>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { symbol } = await req.json();
    if (!symbol || typeof symbol !== "string") {
      return new Response(JSON.stringify({ error: "symbol required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sym = symbol.toUpperCase();
    const key = `sum:${sym}`;
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

    const prompt = `Stock: ${q.shortName ?? sym} (${sym})
Price: ${q.regularMarketPrice} ${q.currency ?? ""}
Change: ${q.regularMarketChangePercent?.toFixed?.(2)}%
Day range: ${q.regularMarketDayLow}-${q.regularMarketDayHigh}
52w range: ${q.fiftyTwoWeekLow}-${q.fiftyTwoWeekHigh}
Mkt cap: ${q.marketCap}

Recent headlines:
${headlines.join("\n") || "(none)"}

Return strict JSON with shape:
{"positives":[string], "negatives":[string], "earnings": string, "outlook": string}
- 3-5 short bullets each for positives & negatives
- earnings: 1-2 sentences on most recent / upcoming earnings if known
- outlook: 1 sentence neutral synthesis
Be concise, factual, no disclaimers.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a concise equity research analyst. Output only valid JSON." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "stock_summary",
            description: "Return structured summary",
            parameters: {
              type: "object",
              properties: {
                positives: { type: "array", items: { type: "string" } },
                negatives: { type: "array", items: { type: "string" } },
                earnings: { type: "string" },
                outlook: { type: "string" },
              },
              required: ["positives", "negatives", "earnings", "outlook"],
            },
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
