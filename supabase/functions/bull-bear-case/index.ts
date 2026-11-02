const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * The bull case and bear case for a stock, researched the way an analyst would
 * (Morningstar's "Bulls Say / Bears Say", TipRanks' "Bulls Say, Bears Say"):
 * from the company's own annual report (what it does and the risks it lists),
 * its latest quarterly results release, its financials, how the stock has done
 * over 1-5 years, and recent news and analyst calls. Each side is a few titled
 * points about the business, never about today's price move.
 */

// Bump when the prompt or response shape changes: older cached rows become misses.
const CACHE_VERSION = "bb1";
// Row key in public.stock_summary_cache (shared with stock-summary's modes).
const MODE = "bullbear";

const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const db = SERVICE_ROLE ? createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } }) : null;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const memo = new Map<string, { exp: number; body: string }>();

interface Source { title: string; publisher: string; url: string }
interface Point { title: string; detail: string }

// ---------------------------------------------------------------------------
// Research from the company's SEC filings
// ---------------------------------------------------------------------------

// The SEC asks automated clients to identify themselves with a contact address.
const SEC_UA = "IntegralStocks hello@integralstocks.com";
const secGet = (url: string, ms = 10000) =>
  fetch(url, { headers: { "User-Agent": SEC_UA, Accept: "application/json,text/html,*/*" }, signal: AbortSignal.timeout(ms) });

let secTickers: { exp: number; map: Map<string, { cik: number; title: string }> } | null = null;
async function secCompany(symbol: string): Promise<{ cik: number; title: string } | null> {
  if (!secTickers || secTickers.exp < Date.now()) {
    const r = await secGet("https://www.sec.gov/files/company_tickers.json", 8000);
    if (!r.ok) return null;
    const j = (await r.json()) as Record<string, { cik_str: number; ticker: string; title: string }>;
    const map = new Map<string, { cik: number; title: string }>();
    for (const v of Object.values(j)) map.set(String(v.ticker).toUpperCase(), { cik: Number(v.cik_str), title: String(v.title) });
    secTickers = { exp: Date.now() + DAY, map };
  }
  return secTickers.map.get(symbol) ?? secTickers.map.get(symbol.replace(/\./g, "-")) ?? null;
}

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”",
  mdash: "—", ndash: "–", bull: "•", hellip: "…", reg: "®", trade: "™", copy: "©",
};
function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}
const clean = (s: string) => decode(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

const EMPH = /font-weight:\s*(bold|[6-9]00)|font-style:\s*italic/i;

/**
 * A filing's HTML as paragraphs. `heading` is the paragraph's bold/italic text when the whole
 * paragraph is emphasized, or its leading bold/italic sentence when it opens with one
 * ("run-in" headings, like Ford's risk factors).
 */
function blocks(html: string): { text: string; heading: string }[] {
  const body = html
    .replace(/<ix:header>[\s\S]*?<\/ix:header>/gi, "")
    .replace(/<(script|style|head)\b[\s\S]*?<\/\1>/gi, "")
    // Tables of figures are noise. Small tables without figures are layout (filings often set
    // "Item 1A. | Risk Factors" in one), so their cells are kept as text.
    .replace(/<table[\s\S]*?<\/table>/gi, (t) =>
      t.length < 8000 && !/>\s*\(?\$?\s*\d[\d,.]{2,}\s*\)?%?\s*</.test(t)
        ? t.replace(/<\/?(table|tr|tbody|th)[^>]*>/gi, " ").replace(/<\/td>/gi, " ")
        : "\n");
  const out: { text: string; heading: string }[] = [];
  for (const chunk of body.split(/<\/(?:div|p|li|h\d)>|<br\s*\/?>/i)) {
    const text = clean(chunk);
    if (!text) continue;
    const own = /^[\s\S]*?<(?:div|p|h\d)\b([^>]*)>/i.exec(chunk)?.[1] ?? "";
    if (EMPH.test(own) || /<h\d/i.test(chunk)) {
      out.push({ text, heading: text });
      continue;
    }
    // Walk the text runs in order: emphasized runs at the start make up the heading.
    let lead = "";
    let all = true;
    const inline = chunk.replace(/<(?!\/?(span|font|b|strong|i|em)\b)[^>]*>/gi, "");
    const runs = /<(span|font|b|strong|i|em)\b([^>]*)>([\s\S]*?)<\/\1>|([^<]+)/gi;
    for (let m; (m = runs.exec(inline)); ) {
      const t = clean(m[3] ?? m[4] ?? "");
      if (!t) continue;
      const em = m[1] ? /^(b|strong|i|em)$/i.test(m[1]) || EMPH.test(m[2] ?? "") : false;
      if (!em) {
        all = false;
        break;
      }
      lead += (lead ? " " : "") + t;
    }
    out.push({ text, heading: all ? text : lead.length >= 40 ? lead : "" });
  }
  return out;
}

/** The longest stretch from a `start` paragraph to the next `end` one: the real section, not the table of contents. */
function section(bs: { text: string }[], start: RegExp, end: RegExp): [number, number] | null {
  let best: [number, number] | null = null;
  let bestLen = 0;
  for (let i = 0; i < bs.length; i++) {
    if (!start.test(bs[i].text)) continue;
    let j = i + 1;
    let len = 0;
    while (j < bs.length && !end.test(bs[j].text)) len += bs[j++].text.length;
    if (len > bestLen) {
      bestLen = len;
      best = [i + 1, j];
    }
  }
  return best && bestLen > 1500 ? best : null;
}

const ITEM = (n: string, title: string) => new RegExp(`^item\\s*${n}\\s*[.:—–-]?\\s*${title}`, "i");
const BOILERPLATE = /forward-looking statements|this annual report on form|unless the context (otherwise )?requires|references (in this report )?to “?(we|us|our)|the terms “/i;
const NOT_A_RISK =
  /^(item|part)\b|^risks? (related|relating|associated|pertaining|specific)|^(general|summary|overview)\b|^(the following|you should (carefully )?consider|the above summary|in addition to the other|this section|investing in our|an investment in)/i;

/** What the company does (Item 1 / 20-F Item 4) and the risk factor headings it lists (Item 1A / 20-F Item 3.D). */
function readAnnualReport(html: string): { business: string; risks: string[] } {
  const bs = blocks(html);
  const biz = section(bs, ITEM("1", "business"), /^item\s*1a\b/i) ??
    section(bs, ITEM("4", "information on the company"), /^item\s*4a\b|^item\s*5\b/i);
  const risk = section(bs, ITEM("1a", "risk factors"), /^item\s*1b\b|^item\s*1c\b|^item\s*2\b/i) ??
    section(bs, /^(d\.\s*)?risk factors$/i, /^item\s*4\b/i);
  let business = "";
  if (biz) {
    for (let i = biz[0]; i < biz[1] && business.length < 2400; i++) {
      const t = bs[i].text;
      if (t.length < 25 && !/[.:]$/.test(t)) continue; // bare sub-headings
      if (/^(table of contents|\d+)$/i.test(t) || BOILERPLATE.test(t)) continue;
      business += (business ? " " : "") + t.replace(/[^|]{0,80}\|\s*(\d{4}\s+)?Form (10-K|20-F|40-F)\s*\|\s*\d+/gi, "").trim();
    }
  }
  const risks: string[] = [];
  if (risk) {
    for (let i = risk[0]; i < risk[1]; i++) {
      const h = bs[i].heading;
      if (h.length < 40 || h.length > 600 || NOT_A_RISK.test(h)) continue;
      // Category labels ("Risks Related to Our Industry") are short and have no full stop.
      if (!/[.!?]$/.test(h) && h.length < 70) continue;
      if (!risks.includes(h)) risks.push(h);
    }
  }
  return { business: business.slice(0, 2400), risks };
}

interface Filing { form: string; filed: string; accession: string; url: string; items: string }

async function recentFilings(cik: number): Promise<Filing[]> {
  const r = await secGet(`https://data.sec.gov/submissions/CIK${String(cik).padStart(10, "0")}.json`);
  if (!r.ok) return [];
  const f = (await r.json())?.filings?.recent ?? {};
  const out: Filing[] = [];
  for (let i = 0; i < (f.form?.length ?? 0); i++) {
    const acc = String(f.accessionNumber[i]);
    out.push({
      form: String(f.form[i]),
      filed: String(f.filingDate[i]),
      accession: acc,
      items: String(f.items?.[i] ?? ""),
      url: `https://www.sec.gov/Archives/edgar/data/${cik}/${acc.replace(/-/g, "")}/${f.primaryDocument[i]}`,
    });
  }
  return out;
}

/** A filing's exhibit 99 documents (press releases), in exhibit order, from its index page. */
async function exhibits99(cik: number, accession: string): Promise<string[]> {
  const r = await secGet(`https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, "")}/${accession}-index.html`);
  if (!r.ok) return [];
  const out: { type: string; url: string }[] = [];
  for (const row of (await r.text()).split(/<tr/i)) {
    const href = /href="(\/Archives\/[^"]+\.html?)"/i.exec(row)?.[1];
    const type = /<td[^>]*>\s*(EX-99[^<]*)<\/td>/i.exec(row)?.[1];
    if (href && type) out.push({ type: type.trim(), url: `https://www.sec.gov${href}` });
  }
  return out.sort((a, b) => a.type.localeCompare(b.type, "en", { numeric: true })).map((x) => x.url);
}

const RELEASE_BOILERPLATE =
  /forward-looking statements|conference call|webcast|live stream|investor relations (web)?site|periodically provides information|non-gaap financial measures? (is|are) (included|provided)|^\(?\d+\)?$|^page \d+/i;

/** The useful part of a results press release: its opening (headline numbers, management's comments) plus any outlook. */
function releaseExcerpt(text: string): string {
  const lines = text.split("\n").filter((l) => !/^EX-99/i.test(l) && !/^exhibit 99/i.test(l) && !RELEASE_BOILERPLATE.test(l));
  let head = "";
  for (const l of lines) {
    if (head.length > 3200) break;
    head += (head ? "\n" : "") + l;
  }
  head = head.slice(0, 3400);
  const outlook = lines.find((l, i) => i > 0 && !head.includes(l) && l.length > 80 && /\b(outlook|guidance|expects?|anticipates?|forecast)\b/i.test(l));
  return outlook ? `${head}\n…\n${outlook.slice(0, 700)}` : head;
}

const RESULTS = /\b(results|revenue|net (income|sales)|earnings per share)\b/i;

/** The latest quarterly results release: exhibit 99 of the newest 8-K under Item 2.02, or a foreign company's 6-K. */
async function latestRelease(cik: number, filings: Filing[]): Promise<{ filed: string; url: string; text: string } | null> {
  const eightK = filings.find((f) => f.form === "8-K" && /\b2\.02\b/.test(f.items));
  const candidates = eightK ? [eightK] : filings.filter((f) => f.form === "6-K").slice(0, 4);
  for (const f of candidates) {
    const url = (await exhibits99(cik, f.accession))[0];
    if (!url) continue;
    const r = await secGet(url);
    if (!r.ok) continue;
    const text = blocks(await r.text()).map((b) => b.text).join("\n");
    if (eightK || RESULTS.test(text.slice(0, 1500))) return { filed: f.filed, url, text: releaseExcerpt(text) };
  }
  return null;
}

interface Research {
  annual?: { form: string; filed: string; url: string; business: string; risks: string[] };
  release?: { filed: string; url: string; text: string };
  /** Plain-English lines about the latest results (yahoo-proxy kind=fundamentals, also from SEC data). */
  results?: string[];
}

const RESEARCH_MODE = "bullbear-research";
const RESEARCH_VERSION = "r1";
const researchMemo = new Map<string, { exp: number; data: Research }>();

/**
 * The company's annual report, latest results release and financial results. They change
 * quarterly, so a copy is kept in the database for a day; and because the SEC sometimes turns
 * away requests from shared cloud servers for a while, the last good copy (up to six months
 * old) fills in whatever can't be fetched right now. Never throws.
 */
async function companyResearch(symbol: string): Promise<Research> {
  const hit = researchMemo.get(symbol);
  if (hit && hit.exp > Date.now()) return hit.data;
  const stored = await readRow(symbol, RESEARCH_MODE, RESEARCH_VERSION, 180 * DAY);
  const saved = (stored?.body ?? null) as Research | null;
  if (saved && stored!.exp > Date.now()) {
    researchMemo.set(symbol, { exp: stored!.exp, data: saved });
    return saved;
  }

  const fresh: Research = {};
  const [filingsData, fundamentals] = await Promise.all([
    (async () => {
      const co = await secCompany(symbol);
      if (!co) return null;
      const filings = await recentFilings(co.cik);
      const annual = filings.find((f) => /^(10-K|20-F|40-F)$/.test(f.form));
      const [report, release] = await Promise.all([
        annual
          ? secGet(annual.url, 15000).then((r) => (r.ok ? r.text() : "")).then((html) => (html ? readAnnualReport(html) : null)).catch(() => null)
          : Promise.resolve(null),
        latestRelease(co.cik, filings).catch(() => null),
      ]);
      return { annual: annual && report && (report.business || report.risks.length) ? { form: annual.form, filed: annual.filed, url: annual.url, ...report } : undefined, release };
    })().catch((e) => {
      console.warn("filing research failed", symbol, e instanceof Error ? e.message : e);
      return null;
    }),
    proxy(`kind=fundamentals&symbol=${encodeURIComponent(symbol)}`),
  ]);
  if (filingsData?.annual) fresh.annual = filingsData.annual;
  if (filingsData?.release) fresh.release = filingsData.release;
  if (Array.isArray(fundamentals?.lines) && fundamentals.lines.length) fresh.results = fundamentals.lines;

  const data: Research = {
    annual: fresh.annual ?? saved?.annual,
    release: fresh.release ?? saved?.release,
    results: fresh.results ?? saved?.results,
  };
  const complete = !!(fresh.annual && fresh.release && fresh.results);
  if (fresh.annual || fresh.release || fresh.results) {
    // Something new came in: keep it a day, or retry the missing parts within the hour.
    const exp = Date.now() + (complete ? DAY : HOUR);
    researchMemo.set(symbol, { exp, data });
    await writeRow(symbol, RESEARCH_MODE, RESEARCH_VERSION, data, exp);
  } else {
    researchMemo.set(symbol, { exp: Date.now() + 10 * 60 * 1000, data });
  }
  return data;
}

// ---------------------------------------------------------------------------
// Market data, results and news (through yahoo-proxy)
// ---------------------------------------------------------------------------

const proxy = (query: string, ms = 12000) =>
  fetch(`${SUPABASE_URL}/functions/v1/yahoo-proxy?${query}`, { headers: { apikey: ANON }, signal: AbortSignal.timeout(ms) })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

/** Monthly closes (dividend-adjusted where Yahoo has them), oldest first. */
// deno-lint-ignore no-explicit-any
function monthlyCloses(chart: any): { t: number; c: number }[] {
  const res = chart?.chart?.result?.[0];
  const ts: number[] = res?.timestamp ?? [];
  const closes: (number | null)[] = res?.indicators?.adjclose?.[0]?.adjclose ?? res?.indicators?.quote?.[0]?.close ?? [];
  return ts.map((t, i) => ({ t, c: closes[i] as number })).filter((p) => typeof p.c === "number" && p.c > 0);
}

/** Percent change over the last `years`, from monthly closes; null if the history doesn't go back that far. */
function trailingReturn(points: { t: number; c: number }[], years: number): number | null {
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const target = last.t - years * 365.25 * 86400;
  const start = points.find((p) => p.t >= target - 20 * 86400);
  if (!start || start.t > target + 45 * 86400) return null;
  return (last.c / start.c - 1) * 100;
}

const signed = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(0)}%`;

// Social platforms and forums aren't journalism; never cite them.
const LOW_QUALITY_HOSTS = /(^|\.)(facebook|twitter|x|instagram|reddit|pinterest|linkedin|quora|tiktok|youtube|stocktwits)\.com$/i;
// The same, when a news search links them through its own site.
const LOW_QUALITY_PUBLISHERS = /stocktwits|reddit|investorshub/i;
const hostOf = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
};

// Headlines about trading rather than the business: no use to a one-to-three-year thesis.
const TRADING_NOISE =
  /options? traders|expect\b.*\bto move|implied move|stocks? (that )?explain|premarket|pre-market|movers|stock market today|what'?s moving|live (updates|coverage)|futures|technical analysis|chart of the day|unusual (options )?activity|short interest|\b(rises|falls|climbs|slips|jumps|drops|gains|sinks)\b \d+(\.\d+)?%/i;

const ageLabel = (sec: number) => {
  const d = (Date.now() / 1000 - sec) / 86400;
  return d < 1 ? "today" : d < 2 ? "yesterday" : `${Math.round(d)} days ago`;
};

// ---------------------------------------------------------------------------
// The AI call
// ---------------------------------------------------------------------------

const SCHEMA = {
  type: "object",
  properties: {
    bull: { type: "array", items: { type: "object", properties: { title: { type: "string" }, detail: { type: "string" } }, required: ["title", "detail"] } },
    bear: { type: "array", items: { type: "object", properties: { title: { type: "string" }, detail: { type: "string" } }, required: ["title", "detail"] } },
    stanceScore: { type: "integer", minimum: -100, maximum: 100 },
    stanceReason: { type: "string" },
  },
  required: ["bull", "bear", "stanceScore", "stanceReason"],
};

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generate(prompt: string, maxTokens: number): Promise<{ raw?: string; error?: string }> {
  const messages = [
    {
      role: "system",
      content:
        "You are a senior equity research analyst writing the \"Bulls Say / Bears Say\" section of a stock report, like Morningstar's and TipRanks'. " +
        "You argue both sides from evidence, specific to the company, in plain English a beginner can follow. " +
        `Reply with ONLY a single valid JSON object matching this JSON Schema (no markdown, no commentary): ${JSON.stringify(SCHEMA)}`,
    },
    { role: "user", content: prompt },
  ];
  const call = (url: string, key: string, model: string) =>
    fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: "json_object" },
        // A safety ceiling: in JSON mode a cut-off reply is unusable, so leave room.
        max_tokens: maxTokens,
        // Reasoning tokens count toward max_tokens; keep them short so the JSON fits.
        ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {}),
      }),
      signal: AbortSignal.timeout(60000),
    });

  // Groq's limits are per minute, so a short 429 is waited out once, and a flaky
  // JSON-validation 400 is retried once, before moving to the next model.
  const groq = async (model: string, key: string) => {
    let r = await call(GROQ_URL, key, model);
    if (r.status === 429 || r.status === 400) {
      const body = await r.clone().text();
      let waitMs = 0;
      if (r.status === 429) {
        const m = body.match(/try again in ([\d.]+)s/i);
        const secs = m ? parseFloat(m[1]) : Number(r.headers.get("retry-after") ?? "0");
        if (secs > 0 && secs <= 15) waitMs = Math.ceil(secs * 1000) + 250;
      } else if (/json_validate_failed/.test(body)) {
        waitMs = 1;
      }
      if (waitMs) {
        console.warn("groq retry", model, r.status, body.slice(0, 200));
        await sleep(waitMs);
        r = await call(GROQ_URL, key, model);
      }
    }
    return r;
  };
  const unavailable = (r: Response | null) => !r || r.status === 429 || r.status === 402 || r.status === 404 || r.status === 400 || r.status === 413 || r.status >= 500;

  let res: Response | null = null;
  const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
  if (GROQ_API_KEY) {
    res = await groq("openai/gpt-oss-120b", GROQ_API_KEY).catch(() => null);
    if (unavailable(res)) {
      console.warn("groq 120b unavailable", res?.status, res ? (await res.clone().text()).slice(0, 300) : "");
      res = await groq("openai/gpt-oss-20b", GROQ_API_KEY).catch(() => null);
    }
  }
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (unavailable(res) && LOVABLE_API_KEY) {
    console.warn("groq unavailable", res?.status, "— falling back to Lovable AI");
    res = await call("https://ai.gateway.lovable.dev/v1/chat/completions", LOVABLE_API_KEY, "google/gemini-3.6-flash").catch(() => null);
  }
  if (!res) return { error: "AI unavailable" };
  if (!res.ok) {
    console.error("ai error", res.status, (await res.text()).slice(0, 500));
    return { error: res.status === 429 || res.status === 402 || res.status === 403 ? "Rate limit, try again shortly." : "AI gateway error" };
  }
  const data = await res.json();
  const msg = data?.choices?.[0]?.message ?? {};
  return { raw: msg?.tool_calls?.[0]?.function?.arguments ?? msg?.content ?? "" };
}

/**
 * Tidies the model's citations so the page can link them: 【3】, [3†source] and [2, 5] become
 * [3] and [2][5]; numbers outside the source list and made-up tags like [SEC] or [Data] go.
 */
function tidyCitations(text: string, sourceCount: number): string {
  return text
    .replace(/【(\d+)[^】]*】/g, "[$1]")
    .replace(/\[(\d+)†[^\]]*\]/g, "[$1]")
    .replace(/\[(\d+(?:\s*[,;]\s*\d+)+)\]/g, (_m, list: string) => list.split(/[,;]/).map((n) => `[${n.trim()}]`).join(""))
    .replace(/\[(\d+)\]/g, (m, n: string) => (Number(n) >= 1 && Number(n) <= sourceCount ? m : ""))
    .replace(/\s*\[(?!\d+\])[^\]\n]{1,40}\]/g, "")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// deno-lint-ignore no-explicit-any
function readPoints(list: any, sourceCount: number): Point[] {
  if (!Array.isArray(list)) return [];
  const out: Point[] = [];
  for (const p of list) {
    const title = typeof p?.title === "string" ? tidyCitations(p.title, 0).replace(/[.:]+$/, "").slice(0, 80) : "";
    const detail = typeof p?.detail === "string" ? tidyCitations(p.detail, sourceCount) : typeof p === "string" ? tidyCitations(p, sourceCount) : "";
    if (detail.length < 20) continue;
    out.push({ title: title || detail.split(/[.,;:]/)[0].slice(0, 60), detail });
  }
  return out.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Cache (memory + public.stock_summary_cache)
// ---------------------------------------------------------------------------

/**
 * A cached row in public.stock_summary_cache. Rows past their expiry are returned only up to
 * `staleFor` past it (for fallbacks); `exp` tells the caller whether it's still fresh. Any
 * failure is just a miss: the cache must never break a request.
 */
async function readRow(symbol: string, mode: string, version: string, staleFor = 0): Promise<{ body: unknown; exp: number } | null> {
  if (!db) return null;
  try {
    const { data, error } = await db
      .from("stock_summary_cache")
      .select("body, expires_at")
      .eq("symbol", symbol)
      .eq("mode", mode)
      .eq("version", version)
      .gt("expires_at", new Date(Date.now() - staleFor).toISOString())
      .abortSignal(AbortSignal.timeout(1500))
      .maybeSingle();
    if (error) {
      console.error("bull-bear cache read failed", error.message);
      return null;
    }
    return data ? { body: data.body, exp: Date.parse(data.expires_at) } : null;
  } catch (e) {
    console.error("bull-bear cache read threw", e instanceof Error ? e.message : e);
    return null;
  }
}

async function writeRow(symbol: string, mode: string, version: string, body: unknown, exp: number) {
  if (!db) return;
  try {
    const { error } = await db
      .from("stock_summary_cache")
      .upsert(
        { symbol, mode, version, body, expires_at: new Date(exp).toISOString(), updated_at: new Date().toISOString() },
        { onConflict: "symbol,mode" },
      )
      .abortSignal(AbortSignal.timeout(2000));
    if (error) console.error("bull-bear cache write failed", error.message);
  } catch (e) {
    console.error("bull-bear cache write threw", e instanceof Error ? e.message : e);
  }
}

const json = (obj: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(typeof obj === "string" ? obj : JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });

// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { symbol } = await req.json().catch(() => ({}));
    const sym = typeof symbol === "string" ? symbol.trim().toUpperCase() : "";
    // Real tickers only, so arbitrary input can't grow the cache table.
    if (!/^[A-Z0-9^=.\-]{1,20}$/.test(sym)) return json({ error: "symbol required" }, 400);

    const hit = memo.get(sym);
    if (hit && hit.exp > Date.now()) return json(hit.body, 200, { "X-Cache": "hit" });
    const stored = await readRow(sym, MODE, CACHE_VERSION);
    if (stored) {
      const body = JSON.stringify(stored.body);
      memo.set(sym, { body, exp: stored.exp });
      return json(body, 200, { "X-Cache": "db-hit" });
    }

    // Everything that doesn't depend on the company's name, at once.
    const isListedCompany = /^[A-Z][A-Z0-9.\-]{0,9}$/.test(sym);
    const [quoteJson, chart, spyChart, searchJson, filings] = await Promise.all([
      proxy(`kind=quote&symbols=${encodeURIComponent(sym)}`),
      proxy(`kind=chart&symbol=${encodeURIComponent(sym)}&range=5y&interval=1mo`),
      proxy(`kind=chart&symbol=SPY&range=5y&interval=1mo`),
      proxy(`kind=search&q=${encodeURIComponent(sym)}&newsCount=25`),
      isListedCompany ? companyResearch(sym) : Promise.resolve({} as Research),
    ]);

    // deno-lint-ignore no-explicit-any
    const q: any = quoteJson?.quoteResponse?.result?.[0] ?? {};
    const meta = chart?.chart?.result?.[0]?.meta ?? {};
    const name: string = q.longName || q.shortName || meta.longName || sym;
    const instrument: string = String(meta.instrumentType ?? "EQUITY").toUpperCase();
    const kindLabel = instrument === "ETF" ? "an exchange-traded fund (ETF)" : instrument === "MUTUALFUND" ? "a mutual fund"
      : instrument === "CRYPTOCURRENCY" ? "a cryptocurrency" : instrument === "INDEX" ? "a stock market index"
      : instrument === "CURRENCY" ? "a currency pair" : instrument === "FUTURE" ? "a futures contract" : "a company's stock";

    // Stories from the site's news feeds (some with the full article text), and a Firecrawl
    // web search for analyst-style write-ups when its key has credit. Both need the name.
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    // deno-lint-ignore no-explicit-any
    const [feedJson, webJson]: any[] = await Promise.all([
      proxy(`kind=news&limit=8&q=${encodeURIComponent(sym)}&name=${encodeURIComponent(name)}`, 12000),
      FIRECRAWL_API_KEY
        ? fetch("https://api.firecrawl.dev/v2/search", {
            method: "POST",
            headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ query: `${name} stock bull case bear case analysis`, limit: 4, tbs: "qdr:m" }),
            signal: AbortSignal.timeout(9000),
          }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
        : Promise.resolve(null),
    ]);

    // ---- Sources, numbered in the order they're listed in the prompt ----
    const sources: Source[] = [];
    const sourceBlocks: string[] = [];
    const add = (src: Source, block: string) => {
      sources.push(src);
      sourceBlocks.push(`[${sources.length}] ${block}`);
    };

    const fmtDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
    if (filings.annual) {
      const a = filings.annual;
      const formName = a.form === "10-K" ? "annual report (Form 10-K)" : `annual report (Form ${a.form})`;
      const risks = a.risks.slice(0, 22).map((r) => `- ${r.length > 190 ? `${r.slice(0, 187).replace(/\s+\S*$/, "")}…` : r}`);
      add(
        { title: `${name} ${formName}, filed ${fmtDate(a.filed)}`, publisher: "SEC filing", url: a.url },
        `${name} ${formName}, filed ${a.filed}.\nWhat the company does: ${a.business || "(not available)"}\n` +
          (risks.length ? `Risks the company itself lists in this report (shortened):\n${risks.join("\n")}` : ""),
      );
    }
    if (filings.release) {
      const r = filings.release;
      add(
        { title: `${name} quarterly results release, ${fmtDate(r.filed)}`, publisher: "SEC filing", url: r.url },
        `${name}'s latest quarterly results press release, filed ${r.filed}:\n${r.text}`,
      );
    }

    // A story counts as about this company when its title names the ticker or the first
    // distinctive word of its name ("Apple", "Rivian", "JPMorgan", "Bitcoin"). Later words are
    // often ordinary ones ("Chase", "Street") that match unrelated stories, and for a fund or
    // index only the ticker is safe.
    const firstWord = instrument === "EQUITY" || instrument === "CRYPTOCURRENCY"
      ? name.replace(/[^\w\s&-]/g, " ").split(/\s+/).find((w) => w.length >= 3 && !/^(the|inc|corp|co|company|group|holdings)$/i.test(w))
      : undefined;
    const ticker = sym.replace(/-USD$/, "");
    const escape = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Tickers match in capitals only ("SPY", not "spy show"); one-letter ones (F, T, C, V)
    // are too common to match at all.
    const tickerRe = ticker.length > 1 ? new RegExp(`(^|[^\\w$])\\$?${escape(ticker)}(?![\\w])`) : null;
    const nameRe = firstWord ? new RegExp(`(^|[^\\w])${escape(firstWord)}(?![\\w])`, "i") : null;
    const about = (title: string) => !!(tickerRe?.test(title) || nameRe?.test(title));
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();
    const fresh = (url: string, title: string, publisher = "") => {
      const key = title.toLowerCase().replace(/\W+/g, " ").trim();
      if (!url || seenUrls.has(url) || seenTitles.has(key) || LOW_QUALITY_HOSTS.test(hostOf(url)) || LOW_QUALITY_PUBLISHERS.test(publisher)) return false;
      seenUrls.add(url);
      seenTitles.add(key);
      return true;
    };

    // Articles with text first (they can carry an argument), then headlines.
    let withText = 0;
    for (const st of (feedJson?.stories ?? []) as { title: string; publisher: string; url: string; published: number; summary: string; text: string }[]) {
      const body = (st.text || st.summary || "").replace(/\s+/g, " ").trim();
      if (withText >= 4 || body.length < 200 || !about(st.title) || !fresh(st.url, st.title, st.publisher)) continue;
      withText++;
      add({ title: st.title, publisher: st.publisher, url: st.url }, `${st.title} — ${st.publisher} (${st.published ? ageLabel(st.published) : "date unknown"})\n${body.slice(0, 900)}`);
    }
    // deno-lint-ignore no-explicit-any
    const webResults: any[] = webJson?.data?.web ?? webJson?.web ?? (Array.isArray(webJson?.data) ? webJson.data : []);
    for (const w of webResults.slice(0, 4)) {
      const title = String(w?.title ?? "").trim();
      const url = String(w?.url ?? "");
      const body = String(w?.description ?? w?.snippet ?? "").replace(/\s+/g, " ").trim();
      if (!title || body.length < 60 || !fresh(url, title, hostOf(url))) continue;
      add({ title, publisher: hostOf(url) || "web", url }, `${title} — ${hostOf(url)}\n${body.slice(0, 600)}`);
    }
    // Headlines from the last 45 days that are about this company: analyst calls,
    // deals, product news. Headline only, so they back a fact, not an argument.
    const headlines: string[] = [];
    const nowSec = Date.now() / 1000;
    // deno-lint-ignore no-explicit-any
    const yahooNews: any[] = searchJson?.news ?? [];
    const feedHeadlines = ((feedJson?.stories ?? []) as { title: string; publisher: string; url: string; published: number }[])
      .map((s) => ({ title: s.title, publisher: s.publisher, link: s.url, providerPublishTime: s.published }));
    for (const n of [...yahooNews, ...feedHeadlines]) {
      if (headlines.length >= 10) break;
      const title = String(n?.title ?? "").trim();
      const url = String(n?.link ?? n?.url ?? "");
      const t = Number(n?.providerPublishTime ?? 0);
      if (!title || (t && nowSec - t > 45 * 86400) || !about(title) || TRADING_NOISE.test(title) || !fresh(url, title, String(n?.publisher ?? ""))) continue;
      add({ title, publisher: String(n.publisher ?? hostOf(url)), url }, `${title} — ${n.publisher ?? hostOf(url)} (${t ? ageLabel(t) : "date unknown"}; headline only)`);
      headlines.push(title);
    }

    // ---- Market data ----
    const num = (v: unknown, d = 2) => (typeof v === "number" && Number.isFinite(v) ? v.toFixed(d) : null);
    const big = (v: unknown) =>
      typeof v === "number" && v > 0 ? (v >= 1e12 ? `$${(v / 1e12).toFixed(2)}T` : v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : `$${(v / 1e6).toFixed(0)}M`) : null;
    const closes = monthlyCloses(chart);
    const spy = monthlyCloses(spyChart);
    const perf = [1, 3, 5]
      .map((y) => {
        const r = trailingReturn(closes, y);
        const s = sym === "SPY" ? null : trailingReturn(spy, y);
        return r == null ? null : `${y} year${y > 1 ? "s" : ""} ${signed(r)}${s == null ? "" : ` (S&P 500 ${signed(s)})`}`;
      })
      .filter(Boolean);
    const earningsTs = Number(q.earningsTimestampStart ?? q.earningsTimestamp ?? 0);
    const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "America/New_York" });
    const market = [
      num(q.regularMarketPrice) && `Share price: ${num(q.regularMarketPrice)} ${q.currency ?? ""}`.trim(),
      big(q.marketCap) && `Market value: ${big(q.marketCap)}`,
      num(q.trailingPE, 1) && `P/E on the last 12 months' earnings: ${num(q.trailingPE, 1)}`,
      num(q.forwardPE, 1) && `P/E on expected earnings for the coming year: ${num(q.forwardPE, 1)}`,
      num(q.epsTrailingTwelveMonths) && `Earnings per share, last 12 months: ${num(q.epsTrailingTwelveMonths)}`,
      num(q.dividendYield) && `Dividend yield: ${num(q.dividendYield)}%`,
      perf.length && `Share price change, with dividends: ${perf.join("; ")}`,
      num(q.fiftyTwoWeekLow) && num(q.fiftyTwoWeekHigh) && `52-week range: ${num(q.fiftyTwoWeekLow)}-${num(q.fiftyTwoWeekHigh)}`,
      earningsTs > 0 && `${earningsTs * 1000 > Date.now() ? "Next" : "Last"} earnings report: ${new Date(earningsTs * 1000).toISOString().slice(0, 10)}`,
    ].filter(Boolean);
    const results: string[] = filings.results ?? [];

    if (!sources.length && !results.length && !market.length) return json({ error: "Not enough information about this symbol.", unavailable: true });

    const rules = [
      `Each point is a lasting argument about the ${instrument === "EQUITY" ? "business" : "investment"}, not about trading. Good subjects: competitive advantages (brand, ecosystem, switching costs, scale, patents, network effects), growth drivers (a named product, segment, market or customer), profitability and cash generation, capital returns, balance sheet strength, management's plans, valuation. Bear subjects: a named competitor or technology shift, regulation or lawsuits, dependence on a customer, supplier or country, cyclical demand, margin pressure, execution risk on a named initiative, debt, dilution, valuation.`,
      `NEVER make a point out of today's price change, the day's range, trading volume, "buying interest", "momentum", "sentiment", or where the price sits in its 52-week range. Never call a stock "near its high" as a reason for anything.`,
      `Be specific to ${name}: name its products, segments, customers, competitors and initiatives, with numbers from above. A point that would fit another company's page unchanged is a failure.`,
      `Each point has a "title" of 2-5 words in Title Case naming the argument (like "Services Flywheel", "China Supply Chain Exposure", "Stretched Valuation"), and a "detail" of 2-3 sentences: the claim, the evidence (a figure or fact from above), and what it means for the stock.`,
      `Every figure and every recent event must come from above. Right after a fact taken from a numbered source, put that source's number in brackets, like [2]. Figures from MARKET DATA and FINANCIAL RESULTS need no citation. Never cite anything else (no "[SEC]", no "[Data]"), never invent a figure, and never state an analyst rating or price target that no source above gives. You may use well-established, long-standing facts about how ${name} makes money and who it competes with, but nothing dated or numeric from memory.`,
      ...(filings.annual
        ? [`Start the bear case from the risks ${name} lists in its own annual report [1], but make each one concrete with the results and news (which competitor, how much of the business is exposed, what has already happened). Don't just repeat the legal wording.`]
        : []),
      `Make both sides equally strong: the bear case is what a thoughtful skeptic would say, not a straw man, and the bull case is what a thoughtful owner would say. If a fact cuts both ways (fast growth but a high P/E), use it on the side where it matters most and don't repeat it on the other.`,
      `At most one point per side may be about valuation, and only with the P/E figures above.`,
      `Exactly 4 points per side, the most important first, each about a different subject.`,
      `Plain English for a beginner: when a finance term is needed, explain it in a few words the first time (for example "free cash flow (the cash left after investing in the business)").`,
    ];
    const prompt = `Today: ${today}
${name} (${sym}) is ${kindLabel}.

MARKET DATA (no citation needed):
${market.map((l) => `- ${l}`).join("\n") || "- (none)"}
${results.length ? `\nFINANCIAL RESULTS FROM ${name.toUpperCase()}'S SEC FILINGS (no citation needed):\n${results.map((l) => `- ${l}`).join("\n")}\n` : ""}
SOURCES (cite as [n]):
${sourceBlocks.join("\n\n") || "(none)"}

TASK: Write the bull case and the bear case for owning ${name} (${sym}) over the next one to three years, the way Morningstar's "Bulls Say / Bears Say" and TipRanks' "Bulls Say, Bears Say" do. Then weigh them.

RULES (breaking one is a failure):
${rules.map((r, i) => `${i + 1}. ${r}`).join("\n")}

stanceScore: an integer from -100 (the bear case clearly wins) to 100 (the bull case clearly wins); 0 means evenly matched. Weigh the points by how much they matter over the next one to three years: growth against valuation, profitability, balance sheet, competitive position. Most stocks belong between -50 and 50; go past 60 either way only when one side wins on several of those.
stanceReason: ONE plain-English sentence naming the strongest bull point and the strongest bear point and which outweighs the other. No citations.

Return JSON: {"bull": [{"title": string, "detail": string}, ...4], "bear": [{"title": string, "detail": string}, ...4], "stanceScore": integer, "stanceReason": string}`;

    // Groq counts the prompt plus max_tokens against an 8K-token-per-minute
    // budget, so the ceiling shrinks as the research grows (about 4 characters a token).
    const promptTokens = Math.ceil((prompt.length + 900) / 3.6);
    const maxTokens = Math.max(2600, Math.min(4000, 7900 - promptTokens));
    const { raw, error } = await generate(prompt, maxTokens);
    if (!raw) return json({ error: error ?? "AI unavailable", unavailable: true });

    // deno-lint-ignore no-explicit-any
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      try { parsed = m ? JSON.parse(m[0]) : {}; } catch { parsed = {}; }
    }
    const bull = readPoints(parsed.bull, sources.length);
    const bear = readPoints(parsed.bear, sources.length);
    if (bull.length < 2 || bear.length < 2) {
      console.error("bull-bear unusable reply", raw.slice(0, 500));
      return json({ error: "Could not build the bull and bear case right now.", unavailable: true });
    }
    const scoreRaw = typeof parsed.stanceScore === "number" ? parsed.stanceScore : parseFloat(parsed.stanceScore);
    const stanceScore = Number.isFinite(scoreRaw) ? Math.max(-100, Math.min(100, Math.round(scoreRaw))) : undefined;
    const stanceReason = stanceScore !== undefined && typeof parsed.stanceReason === "string" && parsed.stanceReason.trim()
      ? tidyCitations(parsed.stanceReason, 0)
      : undefined;

    const body = {
      symbol: sym,
      bull,
      bear,
      ...(stanceScore !== undefined ? { stanceScore } : {}),
      ...(stanceReason ? { stanceReason } : {}),
      sources,
      basis: {
        annualReport: filings.annual ? { form: filings.annual.form, filed: filings.annual.filed } : null,
        resultsRelease: filings.release ? { filed: filings.release.filed } : null,
        articles: sources.length - (filings.annual ? 1 : 0) - (filings.release ? 1 : 0),
      },
      asOf: new Date().toISOString(),
    };
    const text = JSON.stringify(body);
    // A thesis changes slowly; around an earnings report it's refreshed sooner, and so is
    // one written without the company's filings (the SEC couldn't be reached).
    const nearEarnings = earningsTs > 0 && Math.abs(Date.now() - earningsTs * 1000) < 36 * HOUR;
    const missingFilings = isListedCompany && instrument === "EQUITY" && !filings.annual;
    const exp = Date.now() + (nearEarnings || missingFilings ? 3 : 12) * HOUR;
    memo.set(sym, { body: text, exp });
    await writeRow(sym, MODE, CACHE_VERSION, body, exp);
    return json(text);
  } catch (e) {
    console.error(e);
    return json({ error: "Could not build the bull and bear case. Please try again." }, 500);
  }
});
