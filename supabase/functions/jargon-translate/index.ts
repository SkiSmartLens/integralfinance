const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};



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

/**
 * Yahoo (and other React/Next portals) render the article client-side but ship the full body
 * as JSON in the HTML (`bodyBlocks`). Pull the text nodes straight out of it.
 */
function extractEmbedded(html: string): string {
  const i = html.search(/\\?"bodyBlocks\\?"\s*:\s*\[/);
  if (i < 0) return "";
  const seg = html.slice(i, i + 400_000).replace(/\\"/g, '"');
  let out = "";
  for (const m of seg.matchAll(/"text"\s*:\s*(null|"((?:[^"\\]|\\.)*)")/g)) {
    if (m[1] === "null") {
      if (out && !out.endsWith("\n\n")) out += "\n\n";
      continue;
    }
    let t = m[2];
    try { t = JSON.parse(`"${t}"`); } catch { /* keep raw */ }
    out += t;
  }
  out = out.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return out.length >= 500 ? out.slice(0, 12000) : "";
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
  return extractEmbedded(html);
}



/** Pages that are consent walls, bot challenges or nav-only shells are useless to summarize. */
function isJunk(text: string): boolean {
  if (text.length < 400) return true;
  return /just a moment|enable javascript and cookies|verifying you are human|attention required|we and our \d+ partners|iab transparency|privacy dashboard|datenschutz|are you a robot|access denied|content is currently unavailable|oops, something went wrong/i.test(
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

/**
 * Fetch with manual redirect handling so every hop is re-validated against private IPs
 * immediately before use (assertFetchable() is called fresh on every hop, right before the
 * fetch() that uses it, to keep the DNS-rebinding TOCTOU window as small as fetch() allows).
 */
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
        signal: AbortSignal.timeout(6000),
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

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Fetch one Yahoo story by its content-API UUID. */
async function yahooCaasByUuid(uuid: string): Promise<string | null> {
  const body = await rawFetch(`https://finance.yahoo.com/caas/content/article/?uuid=${uuid}`);
  if (!body) return null;
  try {
    const markup = JSON.parse(body)?.items?.[0]?.markup;
    if (typeof markup !== "string") return null;
    const text = extractArticle(markup);
    return text && !isJunk(text) ? text : null;
  } catch {
    return null;
  }
}

function isYahoo(target: string): boolean {
  try { return /(^|\.)yahoo\.com$/.test(new URL(target).hostname); } catch { return false; }
}

/**
 * Yahoo Finance renders /m/, /news/ and /markets/ stubs client-side, so scraping the page often
 * yields a consent/nav shell. Its content API returns the full article markup for the story UUID.
 * Newer slug URLs (…-180858347.html) carry no UUID in the path — it only appears in the HTML.
 */
async function yahooCaas(target: string): Promise<string | null> {
  if (!isYahoo(target)) return null;
  let u: URL;
  try { u = new URL(target); } catch { return null; }
  const uuid = u.pathname.match(UUID_RE)?.[0];
  if (!uuid) return null;
  return await yahooCaasByUuid(uuid);
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

/** Resolve the first task that yields text; all candidates run concurrently. */
function firstSuccess(tasks: Array<() => Promise<string | null>>): Promise<string | null> {
  return new Promise((resolve) => {
    let pending = tasks.length;
    if (pending === 0) return resolve(null);
    let done = false;
    for (const t of tasks) {
      t()
        .then((r) => {
          if (r && !done) { done = true; resolve(r); }
        })
        .catch(() => {})
        .finally(() => {
          pending--;
          if (pending === 0 && !done) resolve(null);
        });
    }
  });
}

/** Race the page itself, its publisher canonicals and every reader proxy at once. */
async function attempt(url: string): Promise<string | null> {
  // Yahoo's own content API is the most reliable source for its stubs — try it first.
  const caas = await yahooCaas(url);
  if (caas) return caas;

  // Kick off proxies for the original URL immediately — they don't depend on the direct fetch.
  const proxyRace = firstSuccess(proxies(url).map((c) => () => readable(c, UA)));

  const html = await rawFetch(url);
  if (html) {
    const isHtml = /<\/?[a-z][\s\S]*>/i.test(html);
    const own = isHtml ? extractArticle(html) : html.trim().slice(0, 12000);
    if (own && !isJunk(own) && !isNavSoup(own)) return own;

    // Yahoo slug URLs hide the story UUID in the page markup — pull it out and use the content API.
    if (isYahoo(url)) {
      const embedded = html.match(/"uuid"\s*:\s*"([0-9a-f-]{36})"/i)?.[1] ?? html.match(UUID_RE)?.[0];
      if (embedded) {
        const viaCaas = await yahooCaasByUuid(embedded);
        if (viaCaas) return viaCaas;
      }
    }

    const alts = altUrls(html, url);
    if (alts.length) {
      const altRace = firstSuccess([
        ...alts.map((a) => () => readable(a)),
        ...alts.flatMap((a) => proxies(a).map((c) => () => readable(c, UA))),
      ]);
      // Publisher pages are the real article — prefer them over syndicator-stub proxies.
      const winner = await altRace;
      if (winner) return winner;
    }
  }

  return await proxyRace;
}

/** One pass only — everything already races in parallel, so a retry just doubles latency. */
async function fetchArticleText(url: string): Promise<string> {
  const t = await attempt(url);
  if (t) return t;
  throw new Error("UNREADABLE");
}








// Plain-text, delimiter-based output (not JSON) so the response can be streamed to the client
// token-by-token and rendered live — the client renders everything between ===PLAIN=== and the
// next marker as it arrives, instead of waiting for one big blocking JSON completion.
const SYSTEM = `You are the Integral Stocks "Jargon Translator". Rewrite financial content in plain, everyday English that a curious beginner (14+ reading level) can follow. Never dumb down the facts — keep every number, name, date, ticker, and quote. Replace jargon with a simpler phrasing and briefly explain it in parentheses the first time it appears.

Respond in EXACTLY this plain-text format — these section markers, each alone on its own line, in this exact order. No JSON, no code fences, nothing before "===PLAIN===".

===PLAIN===
the full article rewritten in plain English (markdown allowed for headings and bullets)
===GLOSSARY===
Term: one-sentence meaning
Term: one-sentence meaning
===TAKEAWAYS===
- one-sentence bullet
- one-sentence bullet
===END===

Rules:
- Write the ===PLAIN=== section first, complete, before starting ===GLOSSARY===.
- 5–8 key takeaways max, each ≤ 20 words, one per line starting with "- ".
- Glossary: only truly jargon-y terms actually used in the source (max 12), one per line as "Term: meaning". Omit the line entirely for a source with no jargon — do not invent one.
- Do not invent facts. If the source is thin, keep the rewrite short.
- Always include all four markers (===PLAIN===, ===GLOSSARY===, ===TAKEAWAYS===, ===END===) even if a section has nothing under it.`;

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
          stream: true,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: `Source URL: ${sourceUrl ?? "(pasted text)"}\n\nSOURCE:\n${source.slice(0, 6000)}` },
          ],
          temperature: 0.3,
          max_tokens: 1600,
          // gpt-oss models burn latency on hidden reasoning tokens unless capped.
          ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {}),
        }),
      });

    const unavailable = (r: Response) =>
      r.status === 429 || r.status === 402 || r.status === 404 || r.status === 400 || r.status >= 500;

    const tryModel = async (u: string, k: string, model: string): Promise<Response | null> => {
      const r = await call(u, k, model);
      if (!unavailable(r)) return r;
      console.error("provider unavailable", model, r.status, (await r.text()).slice(0, 300));
      return null;
    };

    let res: Response | null = null;
    const GROQ = "https://api.groq.com/openai/v1/chat/completions";
    if (GROQ_API_KEY) {
      // llama-3.3-70b-versatile is decommissioned on Groq; 8b-instant gives the fastest first token.
      res = await tryModel(GROQ, GROQ_API_KEY, "llama-3.1-8b-instant");
      if (!res) res = await tryModel(GROQ, GROQ_API_KEY, "openai/gpt-oss-120b");
    }
    if (!res && LOVABLE_API_KEY) {
      res = await call("https://ai.gateway.lovable.dev/v1/chat/completions", LOVABLE_API_KEY, "google/gemini-2.5-flash");
    }


    if (!res) throw new Error("No AI provider configured");

    if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limit, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (res.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!res.ok || !res.body) {
      const body = await res.text();
      console.error("ai gateway error", res.status, body.slice(0, 500));
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Stream the upstream SSE response straight through — the client parses the same
    // OpenAI-style `data: {...}` delta chunks that AIChat already knows how to consume.
    return new Response(res.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Expose-Headers": "X-Source-Url",
        ...(sourceUrl ? { "X-Source-Url": encodeURIComponent(sourceUrl) } : {}),
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
