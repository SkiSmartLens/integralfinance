import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const UA = "Mozilla/5.0 (compatible; IntegralStocks/1.0)";

function isSafeUrl(raw: string): boolean {
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  const h = u.hostname.toLowerCase();
  if (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h === "0.0.0.0" ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    /^169\.254\./.test(h) ||
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h) ||
    h === "::1" ||
    h.startsWith("[::1") ||
    h.startsWith("[fc") || h.startsWith("[fd") || h.startsWith("[fe80")
  ) return false;
  // Block bare IPs entirely — only allow named hosts
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h) || h.startsWith("[")) return false;
  return true;
}

async function fetchArticleText(url: string): Promise<string> {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,*/*" } });
  if (!r.ok) throw new Error(`Fetch failed ${r.status}`);
  const html = await r.text();
  // Strip scripts/styles/nav, then tags. Keep it simple — good enough for LLM input.
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 12000);
}

const SYSTEM = `You are the Integral Stocks "Jargon Translator". Rewrite financial content in plain, everyday English that a curious beginner (14+ reading level) can follow. Never dumb down the facts — keep every number, name, date, ticker, and quote. Replace jargon with a simpler phrasing and briefly explain it in parentheses the first time it appears.

Return STRICT JSON matching:
{
  "plain": "the full article rewritten in plain English (markdown allowed for headings and bullets)",
  "glossary": [ { "term": "EBITDA", "meaning": "a company's profit before interest, taxes, and non-cash costs — a rough proxy for cash the operating business throws off" }, ... ],
  "keyTakeaways": ["1 sentence bullet", "another", "..."]
}

Rules:
- 5–8 key takeaways max, each ≤ 20 words.
- Glossary only includes truly jargon-y terms actually used in the source (max 12).
- Do not invent facts. If the source is thin, keep the rewrite short.
- Respond with JSON only, no code fences.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require authenticated user (prevents unauthenticated abuse of paid AI APIs)
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, url } = (await req.json()) as { text?: string; url?: string };
    let source = (text ?? "").trim();
    let sourceUrl: string | undefined;
    if (!source && url) {
      if (!isSafeUrl(url)) {
        return new Response(JSON.stringify({ error: "URL is not allowed. Provide a public https URL." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      sourceUrl = url;
      source = await fetchArticleText(url);
    }
    if (!source || source.length < 40) {
      return new Response(JSON.stringify({ error: "Paste text or provide a URL (min 40 chars)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const call = (u: string, k: string, model: string) =>
      fetch(u, {
        method: "POST",
        headers: { Authorization: `Bearer ${k}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: `Source URL: ${sourceUrl ?? "(pasted text)"}\n\nSOURCE:\n${source}` },
          ],
          temperature: 0.3,
        }),
      });

    let res: Response | null = null;
    if (GROQ_API_KEY) {
      res = await call("https://api.groq.com/openai/v1/chat/completions", GROQ_API_KEY, "llama-3.3-70b-versatile");
    }
    if ((!res || !res.ok) && LOVABLE_API_KEY) {
      res = await call("https://ai.gateway.lovable.dev/v1/chat/completions", LOVABLE_API_KEY, "google/gemini-2.5-flash");
    }
    if (!res) throw new Error("No AI provider configured");

    if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limit, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (res.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!res.ok) {
      const body = await res.text();
      return new Response(JSON.stringify({ error: "AI gateway error", detail: body }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const j = await res.json();
    const content = j?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(content); } catch { parsed = { plain: content, glossary: [], keyTakeaways: [] }; }
    return new Response(JSON.stringify({ ...parsed, sourceUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
