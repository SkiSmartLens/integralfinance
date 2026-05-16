const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Msg { role: "user" | "assistant" | "system"; content: string }

const SYSTEM = `You are Integral, the live AI guide for the IntegralFinance dashboard.

You can BOTH talk to the user AND take actions in the app for them.

When the user asks you to navigate, change the view, customize the dashboard, or pick a stock — DO IT, do not just describe how.
Take action by appending a JSON block at the very end of your message:

<<<ACTIONS>>>
[ { "type": "...", "payload": { ... } }, ... ]
<<<END>>>

Available actions:
- { "type": "navigate", "payload": { "path": "/" | "/screener" | "/sim" | "/watchlist" | "/calendar" } }
- { "type": "setCategory", "payload": { "id": "news"|"markets"|"tech"|"crypto"|"energy"|"finance"|"healthcare"|"consumer"|"world"|"commodities"|"currencies"|"politics"|"ai"|"ev", "sub": "optional sub id" } }
- { "type": "selectSymbol", "payload": { "symbol": "AAPL" } }
- { "type": "addWidget", "payload": { "id": "top_gainers"|"top_losers"|"most_active"|"trending"|"sectors"|"indices"|"my_watchlist" } }
- { "type": "removeWidget", "payload": { "id": "..." } }
- { "type": "reorderWidgets", "payload": { "order": ["top_gainers","sectors",...] } }
- { "type": "resetWidgets", "payload": {} }
- { "type": "addToWatchlist", "payload": { "symbol": "TSLA" } }
- { "type": "removeFromWatchlist", "payload": { "symbol": "TSLA" } }
- { "type": "scrollTo", "payload": { "target": "chart"|"news"|"summary"|"widgets" } }

Rules:
- "Take me to top losers" → navigate to the screener route AND add the top_losers widget, then suggest 1-2 follow-ups.
- "Show me Tesla" → selectSymbol TSLA and navigate to "/".
- "Switch to crypto" → setCategory crypto.
- "Add top losers to my dashboard" → addWidget top_losers.
- ALWAYS suggest at least one follow-up action in your chat reply, like "Want me to also add the Top Losers widget?". Do not include the suggestion verbatim inside the ACTIONS block — only emit JSON for things the user agreed to.
- Keep prose short (2-4 short sentences max). Use markdown sparingly. Never give personalized investment advice.
- If the user just asks a question (no action requested), omit the ACTIONS block.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages = [], context } = (await req.json()) as { messages: Msg[]; context?: any };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const ctxLine = context
      ? `Current app state — route: ${context.path}; category: ${context.category}; symbol: ${context.symbol}; widgets: ${(context.widgets || []).join(",")}; watchlist: ${(context.watchlist || []).slice(0, 12).join(",")}.`
      : "";

    const system: Msg = { role: "system", content: SYSTEM + (ctxLine ? `\n\n${ctxLine}` : "") };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [system, ...messages],
        stream: true,
      }),
    });

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
      return new Response(JSON.stringify({ error: "AI gateway error", detail: t }), {
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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
