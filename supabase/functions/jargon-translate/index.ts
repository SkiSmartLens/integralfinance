import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";


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

/** Reject IPs in loopback/private/link-local/CGNAT/metadata ranges. */
function isPrivateIp(ip: string): boolean {
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  const v6 = ip.toLowerCase();
  if (v6 === "::" || v6 === "::1") return true;
  if (/^f[cd]/.test(v6)) return true; // unique local
  if (/^fe[89ab]/.test(v6)) return true; // link-local
  if (v6.startsWith("::ffff:")) return isPrivateIp(v6.slice(7));
  return false;
}

/** Resolve the hostname and verify every returned address is public (anti DNS-rebinding). */
async function hostResolvesPublic(hostname: string): Promise<boolean> {
  const addrs: string[] = [];
  for (const type of ["A", "AAAA"] as const) {
    try {
      const r = await Deno.resolveDns(hostname, type);
      addrs.push(...r);
    } catch { /* no records of this type */ }
  }
  if (addrs.length === 0) return false;
  return addrs.every((a) => !isPrivateIp(a));
}

/** Full validation: shape check + DNS resolution check. */
async function assertFetchable(raw: string): Promise<URL | null> {
  if (!isSafeUrl(raw)) return null;
  const u = new URL(raw);
  if (!(await hostResolvesPublic(u.hostname))) return null;
  return u;
}


function stripHtml(html: string): string {
  return html
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
}

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;|&#39;|&rsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&#x2014;|&mdash;/g, "—")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Nav / menu blobs get scraped as giant <p> soup on portals like Yahoo. */
function isNavSoup(t: string): boolean {
  if (/skip to (navigation|main content)/i.test(t)) return true;
  const words = t.split(/\s+/).length;
  const sentences = (t.match(/[.!?]\s/g) ?? []).length;
  return words > 60 && sentences < words / 40;
}

/** Pull the real article body out of a page by keeping substantial <p> blocks. */
function extractArticle(html: string): string {
  const paras: string[] = [];
  for (const m of html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const t = decodeEntities(m[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    if (t.length >= 120 && /[.!?]/.test(t) && !isNavSoup(t)) paras.push(t);
  }
  const joined = paras.join("\n\n");
  if (joined.length >= 500) return joined.slice(0, 12000);
  return "";
}


/** Pages that are consent walls, bot challenges or nav-only shells are useless to summarize. */
function isJunk(text: string): boolean {
  if (text.length < 400) return true;
  return /just a moment|enable javascript and cookies|verifying you are human|attention required|we and our \d+ partners|iab transparency|privacy dashboard|datenschutz|are you a robot|access denied|content is currently unavailable/i.test(
    text.slice(0, 3000),
  );
}

/** Yahoo (and other syndicators) serve stubs — collect publisher links to follow. */
function altUrls(html: string, from: string): string[] {
  const out: string[] = [];
  const pats = [
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/gi,
    /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:url["']/gi,
  ];
  for (const p of pats) {
    for (const m of html.matchAll(p)) {
      try {
        const t = new URL(m[1], from).href;
        if (t.replace(/\/$/, "") === from.replace(/\/$/, "")) continue;
        if (isSafeUrl(t) && !out.includes(t)) out.push(t);
      } catch { /* ignore */ }
    }
  }
  return out;
}

/** Consent cookies so EU-region edges don't get the GDPR wall instead of the article. */
const CONSENT_COOKIE =
  "GUC=1; EuConsent=CPuKGCPuKGCPuAcABBENBqCsAP_AAH_AAAAAF5wBAAIAAgABAAAA; A1=d=1; consent=true; euconsent-v2=CPuKGCPuKGCPuAcABBENBqCsAP_AAH_AAAAAF5wBAAIAAgABAAAA";

function withConsentParams(target: string): string {
  try {
    const u = new URL(target);
    if (/(^|\.)yahoo\.com$/.test(u.hostname)) {
      u.searchParams.set("guccounter", "1");
      return u.href;
    }
  } catch { /* ignore */ }
  return target;
}

/** Fetch with manual redirect handling so every hop is re-validated against private IPs. */
async function rawFetch(target: string, ua = BROWSER_UA): Promise<string | null> {
  let current = withConsentParams(target);
  try {
    for (let hop = 0; hop < 5; hop++) {
      if (!(await assertFetchable(current))) return null;
      const r = await fetch(current, {
        headers: {
          "User-Agent": ua,
          Accept: "text/html,application/xhtml+xml,text/plain,*/*",
          "Accept-Language": "en-US,en;q=0.9",
          Cookie: CONSENT_COOKIE,
        },
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      });
      if (r.status >= 300 && r.status < 400) {
        const loc = r.headers.get("location");
        await r.body?.cancel();
        if (!loc) return null;
        current = new URL(loc, current).href;
        continue;
      }
      if (!r.ok) return null;
      return await r.text();
    }
    return null;
  } catch {
    return null;
  }
}


async function readable(target: string, ua = BROWSER_UA): Promise<string | null> {
  const body = await rawFetch(target, ua);
  if (!body) return null;
  const isHtml = /<\/?(html|body|div|p|article)\b/i.test(body);
  const text = isHtml ? extractArticle(body) : body.trim().slice(0, 12000);
  if (!text || isJunk(text)) return null;
  // Nav-soup detection only makes sense for scraped HTML; reader output is already clean markdown.
  if (isHtml && isNavSoup(text)) return null;
  return text;
}

function proxies(u: string): string[] {
  const noScheme = u.replace(/^https?:\/\//, "");
  return [
    `https://r.jina.ai/${u}`,
    `https://r.jina.ai/http://${noScheme}`,
    `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  ];
}

/** One pass: publisher canonical pages, then the page itself, then reader proxies. */
async function attempt(url: string): Promise<string | null> {
  const html = (await rawFetch(url)) ?? (await rawFetch(url, UA));
  const alts = html ? altUrls(html, url) : [];

  // 1) publisher pages, direct
  for (const a of alts) {
    const t = await readable(a);
    if (t) return t;
  }
  // 2) the requested page itself
  if (html) {
    const isHtml = /<\/?[a-z][\s\S]*>/i.test(html);
    const own = isHtml ? extractArticle(html) : html.trim().slice(0, 12000);
    if (own && !isJunk(own) && !isNavSoup(own)) return own;
  }
  // 3) reader proxies for the publisher pages, then the original
  for (const target of [...alts, url]) {
    for (const c of proxies(target)) {
      const t = await readable(c, UA);
      if (t) return t;
    }
  }
  return null;
}

/** Portals intermittently serve consent/bot shells — retry the whole cascade a few times. */
async function fetchArticleText(url: string): Promise<string> {
  for (let i = 0; i < 3; i++) {
    const t = await attempt(url);
    if (t) return t;
    await new Promise((r) => setTimeout(r, 600));
  }
  throw new Error("UNREADABLE");
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


    const { text, url } = (await req.json()) as { text?: string; url?: string };
    let source = (text ?? "").trim();
    let sourceUrl: string | undefined;
    if (!source && url) {
      if (!(await assertFetchable(url))) {
        return new Response(JSON.stringify({ error: "URL is not allowed. Provide a public https URL." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      sourceUrl = url;
      try {
        source = await fetchArticleText(url);
      } catch {
        return new Response(
          JSON.stringify({
            error:
              "We couldn’t read that page — it may block automated readers or require a login. Try copying the article text and pasting it instead.",
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
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
