import { corsHeaders } from "@supabase/supabase-js/cors";

const ENDPOINTS: Record<string, string> = {
  quote: "https://query1.finance.yahoo.com/v7/finance/quote",
  chart: "https://query1.finance.yahoo.com/v8/finance/chart",
  search: "https://query1.finance.yahoo.com/v1/finance/search",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const kind = url.searchParams.get("kind") ?? "quote";
    const base = ENDPOINTS[kind];
    if (!base) {
      return new Response(JSON.stringify({ error: "invalid kind" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let target = base;
    const params = new URLSearchParams();

    if (kind === "quote") {
      const symbols = url.searchParams.get("symbols") ?? "";
      if (!symbols) {
        return new Response(JSON.stringify({ error: "symbols required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      params.set("symbols", symbols);
    } else if (kind === "chart") {
      const symbol = url.searchParams.get("symbol");
      if (!symbol) {
        return new Response(JSON.stringify({ error: "symbol required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      target = `${base}/${encodeURIComponent(symbol)}`;
      params.set("range", url.searchParams.get("range") ?? "1d");
      params.set("interval", url.searchParams.get("interval") ?? "5m");
      params.set("includePrePost", "false");
    } else if (kind === "search") {
      const q = url.searchParams.get("q") ?? "stock market";
      params.set("q", q);
      params.set("newsCount", url.searchParams.get("newsCount") ?? "20");
      params.set("quotesCount", "0");
    }

    const upstream = `${target}?${params.toString()}`;
    const res = await fetch(upstream, {
      headers: {
        // Yahoo blocks default fetch UA; pretend to be a browser
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json,text/plain,*/*",
      },
    });

    const body = await res.text();
    return new Response(body, {
      status: res.ok ? 200 : res.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=10",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
