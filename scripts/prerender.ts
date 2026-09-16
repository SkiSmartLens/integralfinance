// Build-time prerendering (runs as a `postbuild` hook).
//
// The app is a client-rendered SPA, so a crawler that doesn't execute JS sees
// only the loading shell in dist/index.html. This script writes a static
// HTML file per public route, in two tiers:
//
//  - "Head-only" routes (static utility pages + every ticker page): unique
//    <title>/description/canonical/og/twitter tags baked in, but the visible
//    body is left as the shell (loading state + hidden crawler fallback nav).
//    Cheap, safe, broad coverage — worthwhile even without real body content
//    because it gives search snippets a real per-page title/description
//    instead of one generic pair repeated across every URL.
//
//  - "Full" routes (glossary, blog, FAQ): the evergreen, single-purpose,
//    fully data-driven content that AI answer engines are most likely to
//    quote. These get real semantic HTML in the body too, hand-templated
//    directly from the same data the React pages render — not run through a
//    browser, so a bug here can produce a worse static page but can never
//    fail the production build.
//
// Ticker pages are hard-capped so the published build can never blow past
// hosting limits (50,000 files / 3 GiB).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { CATEGORIES, INDEX_TICKERS, TRENDING, SECTORS } from "../src/lib/categories";
import { POSTS, renderBody, type BlogPost } from "../src/content/blog";
import { GLOSSARY, getGlossaryEntry, type GlossaryEntry } from "../src/content/glossary";

const SITE = "https://integralstocks.com";
const DIST = resolve("dist");
const MAX_TICKER_PAGES = Number(process.env.MAX_PRERENDER_PAGES ?? 800);

const esc = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const shellPath = resolve(DIST, "index.html");
if (!existsSync(shellPath)) {
  console.warn("prerender: dist/index.html not found — skipping");
  process.exit(0);
}
const SHELL = readFileSync(shellPath, "utf8");

function writePage(path: string, html: string) {
  const outPath = path === "/" ? resolve(DIST, "index.html") : resolve(DIST, `.${path}/index.html`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html);
}

// ---------- Tier 1: head-only (title/description/canonical/og/twitter) ----------

interface Route {
  path: string;
  title: string;
  description: string;
}

function headFor(r: Route) {
  const url = `${SITE}${r.path}`;
  const image = `${SITE}/stocks-hero.webp`;
  return [
    `<title>${esc(r.title)}</title>`,
    `<meta name="description" content="${esc(r.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:title" content="${esc(r.title)}" />`,
    `<meta property="og:description" content="${esc(r.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(r.title)}" />`,
    `<meta name="twitter:description" content="${esc(r.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ].join("\n    ");
}

/** Strip the shell's own head tags before injecting route-specific ones — format-agnostic, so it doesn't matter whether the source uses `">` or `" />`. */
function headOnlyPage(r: Route): string {
  let html = SHELL.replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name="description"[^>]*>/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>/gi, "")
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, "")
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, "");
  html = html.replace(/<\/head>/i, `    ${headFor(r)}\n  </head>`);
  return html;
}

// Static utility pages. Deliberately excludes: routes covered by the "full"
// tier below (glossary, blog, FAQ); "/dashboard" (robots.txt-disallowed, so
// no compliant crawler ever requests it); "/news" (a non-canonical alias of
// "/market-brief" — same reason it's left out of sitemap.xml).
const staticRoutes: Route[] = [
  {
    path: "/",
    title: "Learn to Invest — AI Stock Analysis for Beginners",
    description:
      "Beginner-friendly AI stock analysis, plain-English explainers, live S&P 500 signals, and a risk-free simulator to practice before you invest.",
  },
  {
    path: "/stocks",
    title: "Stocks — Live Prices & Beginner Explainers",
    description:
      "Browse live stock prices with plain-English AI breakdowns of why each stock is moving today. Built for first-time investors.",
  },
  {
    path: "/learn",
    title: "Learn Investing — Free Beginner Course",
    description:
      "A free, structured path from complete beginner to confident investor: basics, charts, indicators, patterns, portfolios and advanced tools.",
  },
  { path: "/learn/basics", title: "Investing Basics for Beginners", description: "Start here: what stocks are, how markets work, and the vocabulary you need before your first trade." },
  { path: "/learn/reading", title: "How to Read a Stock Chart", description: "Learn to read price charts step by step: candles, timeframes, volume and what a move actually tells you." },
  { path: "/learn/indicators", title: "Stock Indicators Explained Simply", description: "Moving averages, RSI, MACD and volume — what each indicator measures and when it is genuinely useful." },
  { path: "/learn/patterns", title: "Chart Patterns for Beginners", description: "The handful of chart patterns worth knowing, what they suggest, and why most of them are not signals on their own." },
  { path: "/learn/portfolio", title: "Build a Beginner Investing Portfolio", description: "Diversification, position sizing and risk: how to put a simple, resilient portfolio together from scratch." },
  { path: "/learn/advanced", title: "Advanced Investing Tools Explained", description: "Options, derivatives and advanced order types explained in plain English — plus when beginners should skip them." },
  { path: "/academy", title: "Investor Academy — A Guided Course for Beginners", description: "A short, gamified, linear course that takes total beginners from zero to confident with the stock market basics." },
  { path: "/academy/1", title: "Investor Academy: Lesson 1", description: "The first lesson in the Investor Academy — a guided, gamified course for total beginners." },
  { path: "/simulator", title: "Free Stock Market Simulator for Beginners", description: "Practice trading with virtual cash. Real live prices, zero risk, and AI feedback explaining every trade you make." },
  { path: "/sim", title: "Practice Trading — $100,000 Paper Trading Account", description: "A free, single-player paper trading simulator with a $100,000 virtual account and market/limit/stop orders." },
  { path: "/screener", title: "Stock Screener — Find Stocks by Filter", description: "Filter stocks by price, movement and volume with a simple screener designed for people new to investing." },
  { path: "/calendar", title: "Earnings & Market Calendar", description: "Upcoming earnings dates and market events, with plain-English notes on why each one can move prices." },
  { path: "/watchlist", title: "Your Stock Watchlist", description: "Track the stocks you care about with live prices and AI explanations of each day's move." },
  { path: "/market-brief", title: "Daily Market Brief — Today in 2 Minutes", description: "A short daily read on what moved the market today and why, written for beginners rather than traders." },
  { path: "/translate", title: "Jargon Translator — Finance Terms in Plain English", description: "Paste any confusing finance sentence and get a plain-English translation instantly. No jargon left behind." },
  { path: "/start", title: "Start Here — Your First Steps in Investing", description: "Two quick questions and we'll point you at the right first lesson, first chart and first practice trade." },
  { path: "/about", title: "About IntegralStocks", description: "Why we built a beginner-first investing site: live data, plain-English AI explainers and risk-free practice." },
  { path: "/contact", title: "Contact IntegralStocks", description: "Questions, feedback or partnership ideas? Get in touch with the IntegralStocks team." },
  { path: "/data-sources", title: "Data Sources & Methodology", description: "Where our market data comes from, how often it refreshes, and how our AI explanations are grounded." },
  { path: "/disclaimer", title: "Disclaimer — Not Financial Advice", description: "IntegralStocks is educational. Nothing on this site is financial advice or a recommendation to buy or sell." },
  { path: "/privacy", title: "Privacy Policy — IntegralStocks", description: "How IntegralStocks collects, uses, and protects your data." },
  { path: "/terms", title: "Terms of Service — IntegralStocks", description: "The terms that govern your use of IntegralStocks." },
  { path: "/affiliate-disclosure", title: "Affiliate Disclosure — IntegralStocks", description: "How IntegralStocks discloses affiliate relationships and sponsored links." },
];

function collectTickers(): string[] {
  const set = new Set<string>();
  for (const c of CATEGORIES) {
    c.symbols?.forEach((s) => set.add(s));
    c.subTopics?.forEach((st) => st.symbols?.forEach((s) => set.add(s)));
  }
  INDEX_TICKERS.forEach((s) => set.add(s));
  TRENDING.forEach((s) => set.add(s));
  SECTORS.forEach((s) => set.add(s.symbol));
  return Array.from(set).sort();
}

const tickerRoutes: Route[] = collectTickers()
  .map((symbol) => ({
    path: `/stocks/${symbol.toLowerCase()}`,
    title: `${symbol} Stock Price & Chart | IntegralStocks`,
    description: `${symbol} live chart plus a plain-English AI breakdown of why the stock is moving today. Beginner-friendly, updated continuously.`,
  }))
  .slice(0, MAX_TICKER_PAGES);

// ---------- Tier 2: full content (glossary, blog, FAQ) ----------

const STATIC_HEADER = `
<header class="border-b">
  <nav class="container mx-auto px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold">
    <a href="/" class="font-extrabold text-primary">IntegralStocks</a>
    <a href="/stocks">Stocks</a>
    <a href="/market-brief">News</a>
    <a href="/simulator">Simulator</a>
    <a href="/learn">Learn</a>
    <a href="/learn/glossary">Glossary</a>
    <a href="/blog">Blog</a>
    <a href="/translate">Jargon Translator</a>
    <a href="/faq">FAQ</a>
    <a href="/about">About</a>
  </nav>
</header>`;

const STATIC_FOOTER = `
<footer class="border-t mt-auto">
  <div class="container mx-auto px-4 py-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
    <a href="/about">About</a>
    <a href="/faq">FAQ</a>
    <a href="/data-sources">Data Sources</a>
    <a href="/disclaimer">Disclaimer</a>
    <a href="/privacy">Privacy Policy</a>
    <a href="/terms">Terms of Service</a>
    <a href="/affiliate-disclosure">Affiliate Disclosure</a>
    <a href="/contact">Contact</a>
  </div>
</footer>`;

interface FullPageInput {
  path: string;
  title: string;
  description: string;
  keywords?: string;
  jsonLd: Record<string, unknown>[];
  bodyHtml: string;
}

/** Same strip-then-inject approach as headOnlyPage, plus extra JSON-LD and a real body. */
function fullPage(input: FullPageInput): string {
  const url = `${SITE}${input.path}`;
  let html = SHELL.replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name="description"[^>]*>/gi, "")
    .replace(/<meta\s+name="keywords"[^>]*>/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>/gi, "")
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, "")
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, "");

  const headExtras = [
    `<title>${esc(input.title)}</title>`,
    `<meta name="description" content="${esc(input.description)}" />`,
    input.keywords ? `<meta name="keywords" content="${esc(input.keywords)}" />` : "",
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:title" content="${esc(input.title)}" />`,
    `<meta property="og:description" content="${esc(input.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(input.title)}" />`,
    `<meta name="twitter:description" content="${esc(input.description)}" />`,
    ...input.jsonLd.map((obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`),
  ]
    .filter(Boolean)
    .join("\n    ");
  html = html.replace(/<\/head>/i, `    ${headExtras}\n  </head>`);

  // Greedy match up to the last </div> before </body>: Vite's build moves the
  // entry <script type="module"> into <head>, so #root's closing div is the
  // last thing in <body>. Greedy [\s\S]* spans the whole nested root block
  // regardless of internal nesting since </body> only occurs once.
  html = html.replace(/<div id="root">[\s\S]*<\/div>\s*(?=<\/body>)/, `<div id="root">${input.bodyHtml}</div>\n  `);

  return html;
}

const breadcrumb = (items: { name: string; item: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, ...it })),
});

// -- Glossary --

function glossaryTermPage(entry: GlossaryEntry) {
  const path = `/learn/glossary/${entry.slug}`;
  const related = entry.related.map((s) => getGlossaryEntry(s)).filter((e): e is GlossaryEntry => !!e);

  const bodyHtml = `
    <div class="min-h-screen bg-background flex flex-col">
      ${STATIC_HEADER}
      <main class="flex-1 container mx-auto px-4 py-10 max-w-2xl">
        <div class="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <a href="/learn" class="hover:text-foreground transition-colors">Learn</a>
          <span>/</span>
          <a href="/learn/glossary" class="hover:text-foreground transition-colors">Glossary</a>
        </div>
        <h1 class="text-3xl font-extrabold tracking-tight mb-4">
          What does <span class="text-primary">${esc(entry.term)}</span> mean?
        </h1>
        <p class="text-lg leading-relaxed font-medium bg-accent/50 border rounded-lg p-4 mb-6">${esc(entry.short)}</p>
        <p class="text-muted-foreground leading-relaxed mb-8">${esc(entry.body)}</p>
        <a href="${entry.learnMore.to}" class="inline-flex items-center gap-1.5 text-primary font-bold hover:underline mb-10">Learn more in ${esc(entry.learnMore.label)} &rarr;</a>
        ${
          related.length
            ? `<div class="border-t pt-6">
          <h2 class="text-sm font-extrabold uppercase tracking-wider text-muted-foreground mb-3">Related terms</h2>
          <div class="flex flex-wrap gap-2">
            ${related
              .map(
                (r) =>
                  `<a href="/learn/glossary/${r.slug}" class="px-3 py-1.5 rounded-full border text-sm font-semibold hover:bg-accent transition-colors">${esc(r.term)}</a>`,
              )
              .join("\n            ")}
          </div>
        </div>`
            : ""
        }
      </main>
      ${STATIC_FOOTER}
    </div>`;

  return fullPage({
    path,
    title: `What Does ${entry.term} Mean? — Plain-English Definition | IntegralStocks`,
    description: entry.short,
    keywords: `what does ${entry.term.toLowerCase()} mean, ${entry.term.toLowerCase()} definition, ${entry.term.toLowerCase()} explained, stock market glossary`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "DefinedTerm",
        name: entry.term,
        description: entry.short,
        url: `${SITE}${path}`,
        inDefinedTermSet: `${SITE}/learn/glossary`,
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `What does ${entry.term} mean?`,
            acceptedAnswer: { "@type": "Answer", text: entry.short },
          },
        ],
      },
      breadcrumb([
        { name: "Home", item: `${SITE}/` },
        { name: "Learn", item: `${SITE}/learn` },
        { name: "Glossary", item: `${SITE}/learn/glossary` },
        { name: entry.term, item: `${SITE}${path}` },
      ]),
    ],
    bodyHtml,
  });
}

function glossaryIndexPage() {
  const sorted = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));
  const bodyHtml = `
    <div class="min-h-screen bg-background flex flex-col">
      ${STATIC_HEADER}
      <main class="flex-1 container mx-auto px-4 py-10 max-w-3xl">
        <div class="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <a href="/learn" class="hover:text-foreground transition-colors">&larr; Learn</a>
        </div>
        <h1 class="text-3xl font-extrabold tracking-tight mb-2">Stock Market Glossary</h1>
        <p class="text-muted-foreground mb-8">Plain-English definitions for the investing terms you'll run into most often. Tap any term for a full one-page explanation.</p>
        <div class="grid sm:grid-cols-2 gap-3">
          ${sorted
            .map(
              (g) =>
                `<a href="/learn/glossary/${g.slug}" class="block border rounded-lg p-4 hover:bg-accent transition-colors">
            <div class="font-bold mb-1">${esc(g.term)}</div>
            <div class="text-sm text-muted-foreground">${esc(g.short)}</div>
          </a>`,
            )
            .join("\n          ")}
        </div>
      </main>
      ${STATIC_FOOTER}
    </div>`;

  return fullPage({
    path: "/learn/glossary",
    title: "Stock Market Glossary — Investing Terms Explained | IntegralStocks",
    description:
      "A plain-English glossary of stock market and investing terms — market cap, P/E ratio, RSI, MACD, dividends, and more — each explained in one clear page.",
    keywords:
      "stock market glossary, investing terms glossary, finance dictionary, what does market cap mean, what does P/E ratio mean, stock indicators explained",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "DefinedTermSet",
        name: "IntegralStocks Investing Glossary",
        url: `${SITE}/learn/glossary`,
        hasDefinedTerm: GLOSSARY.map((g) => ({
          "@type": "DefinedTerm",
          name: g.term,
          description: g.short,
          url: `${SITE}/learn/glossary/${g.slug}`,
        })),
      },
      breadcrumb([
        { name: "Home", item: `${SITE}/` },
        { name: "Learn", item: `${SITE}/learn` },
        { name: "Glossary", item: `${SITE}/learn/glossary` },
      ]),
    ],
    bodyHtml,
  });
}

// -- FAQ --

const FAQS = [
  {
    q: "Is IntegralStocks an AI-powered stock website for beginners?",
    a: "Yes. IntegralStocks is a free, AI-powered stock website built specifically for beginners. Every stock page includes a plain-English AI breakdown of why the price moved, and the whole site — from the dashboard to the simulator — is designed for people who are new to investing, not professional traders.",
  },
  {
    q: "What is IntegralStocks?",
    a: "IntegralStocks is a free, beginner-friendly stock market dashboard designed to help new investors understand how the market works. You can track live stock prices, read market news, and view plain‑English AI insights that explain major price movements and trends.",
  },
  {
    q: "Is IntegralStocks free?",
    a: "Yes. All core features — including stock quotes, charts, news summaries, and the paper trading simulator — are completely free to use.",
  },
  {
    q: "Where do the stock prices come from?",
    a: "Stock quotes and charts are sourced from publicly accessible Yahoo Finance endpoints. Some exchanges may provide delayed data, typically by up to 15 minutes.",
  },
  {
    q: "How accurate are the AI insights?",
    a: "AI insights are generated by large language models and summarize publicly available news and market information. They are educational explanations, not financial advice, and may occasionally contain inaccuracies. Always verify important information with primary sources.",
  },
  {
    q: "Can I trade real stocks on IntegralStocks?",
    a: "No. IntegralStocks offers a paper trading simulator that uses simulated money so you can practice strategies risk‑free. We do not support real trading or connect to brokerage accounts.",
  },
  {
    q: "Do I need an account?",
    a: "You can browse stock prices, charts, and news without an account. Creating an account allows you to save a watchlist and use the paper trading simulator.",
  },
  {
    q: "Is IntegralStocks safe to use?",
    a: "Yes. The site uses modern authentication, encrypted HTTPS connections, and never asks for brokerage credentials, payment information, or sensitive financial data.",
  },
];

function faqPage() {
  const bodyHtml = `
    <div class="min-h-screen bg-background">
      ${STATIC_HEADER}
      <main class="container mx-auto px-4 py-10 max-w-3xl">
        <h1 class="text-3xl font-bold mb-6">Frequently Asked Questions</h1>
        <div class="space-y-6">
          ${FAQS.map(
            (f) => `<section>
            <h2 class="text-lg font-semibold mb-1">${esc(f.q)}</h2>
            <p class="text-muted-foreground leading-relaxed">${esc(f.a)}</p>
          </section>`,
          ).join("\n          ")}
        </div>
      </main>
      ${STATIC_FOOTER}
    </div>`;

  return fullPage({
    path: "/faq",
    title: "FAQ — IntegralStocks (Beginner Stock Market Questions)",
    description:
      "Answers to common questions about IntegralStocks: how it works, where data comes from, AI insights, and the free trading simulator.",
    keywords: "stock market FAQ, investing questions, how does IntegralStocks work, beginner investor questions",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
    bodyHtml,
  });
}

// -- Blog --

const CATEGORY_ORDER = [
  "Beginner Basics",
  "Investing Basics",
  "Market Education",
  "Stock Research",
  "Technical Analysis",
  "Risk Management",
  "Wealth Building",
  "Market Psychology",
  "Financial Literacy",
  "Platform Story",
];

function blogIndexPage() {
  const sorted = [...POSTS].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
  const groups = new Map<string, BlogPost[]>();
  for (const p of sorted) {
    const cat = p.category ?? "Other";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(p);
  }
  const orderedCats = [
    ...CATEGORY_ORDER.filter((c) => groups.has(c)),
    ...Array.from(groups.keys()).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  const bodyHtml = `
    <div class="min-h-screen bg-background flex flex-col">
      ${STATIC_HEADER}
      <main class="max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 flex-1">
        <h1 class="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] mb-3">Learn to invest, one short read at a time</h1>
        <p class="text-base sm:text-lg text-muted-foreground mb-10 max-w-2xl">Beginner-friendly explainers on stocks, charts, valuation, and the tools we use — written for people who've never invested before.</p>
        ${orderedCats
          .map(
            (cat) => `<section class="mb-12">
          <h2 class="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-2">${esc(cat)}</h2>
          <ul class="divide-y border-t">
            ${(groups.get(cat) ?? [])
              .map(
                (p) => `<li>
              <a href="/blog/${p.slug}" class="group block py-6">
                <div class="text-xs text-muted-foreground mb-2">${p.readMinutes} min read &middot; ${new Date(p.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                <h3 class="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug">${esc(p.title)}</h3>
                <p class="text-sm sm:text-base text-muted-foreground mt-2 leading-relaxed">${esc(p.description)}</p>
              </a>
            </li>`,
              )
              .join("\n            ")}
          </ul>
        </section>`,
          )
          .join("\n        ")}
      </main>
      ${STATIC_FOOTER}
    </div>`;

  return fullPage({
    path: "/blog",
    title: "Blog — Beginner Investing Guides & Explainers",
    description:
      "Plain-English guides for beginner investors: how to start with $100, how to read a chart, what P/E ratio means, paper trading vs real trading, and more.",
    keywords: "investing blog, beginner investing guides, how to invest, stock market explained, investing tips",
    jsonLd: [{ "@context": "https://schema.org", "@type": "Blog", name: "IntegralStocks Blog", url: `${SITE}/blog` }],
    bodyHtml,
  });
}

function blogPostPage(post: BlogPost) {
  const path = `/blog/${post.slug}`;
  const blocks = renderBody(post.body);
  const related = POSTS.filter((p) => p.slug !== post.slug && p.tags?.some((t) => post.tags?.includes(t))).slice(0, 3);

  const articleHtml = blocks
    .map((b) => {
      if (b.type === "h2") return `<h2 class="text-2xl font-extrabold tracking-tight mt-8">${b.html}</h2>`;
      if (b.type === "h3") return `<h3 class="text-lg font-bold mt-6">${b.html}</h3>`;
      if (b.type === "ul" || b.type === "ol" || b.type === "table") return b.html;
      return `<p>${b.html}</p>`;
    })
    .join("\n          ");

  const bodyHtml = `
    <div class="min-h-screen bg-background flex flex-col">
      ${STATIC_HEADER}
      <main class="max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 flex-1">
        <a href="/blog" class="inline-flex items-center gap-1 text-sm text-muted-foreground mb-6">&larr; All posts</a>
        <h1 class="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] mb-4">${esc(post.title)}</h1>
        <div class="text-xs text-muted-foreground mb-6">${post.readMinutes} min read &middot; ${new Date(post.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
        <article class="prose-like space-y-5 text-base leading-relaxed">
          ${articleHtml}
        </article>
        ${
          post.tickers && post.tickers.length > 0
            ? `<section class="mt-12 border-t pt-8">
          <h2 class="text-lg font-extrabold mb-4">Related stocks</h2>
          <div class="flex flex-wrap gap-2">
            ${post.tickers.map((t) => `<a href="/stocks/${t.toLowerCase()}" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border-2 border-primary/30 text-sm font-bold">${t}</a>`).join("\n            ")}
          </div>
        </section>`
            : ""
        }
        ${
          related.length > 0
            ? `<section class="mt-10 border-t pt-8">
          <h2 class="text-lg font-extrabold mb-4">More for beginners</h2>
          <ul class="space-y-3">
            ${related.map((r) => `<li><a href="/blog/${r.slug}" class="font-bold">${esc(r.title)}</a></li>`).join("\n            ")}
          </ul>
        </section>`
            : ""
        }
      </main>
      ${STATIC_FOOTER}
    </div>`;

  return fullPage({
    path,
    title: `${post.title} | Integral Stocks Blog`,
    description: post.description,
    keywords: [...(post.tags ?? []), ...(post.tickers ?? []), ...(post.sectors ?? []), "investing for beginners", "how to invest"].join(", "),
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: post.description,
        datePublished: post.publishedAt,
        dateModified: post.publishedAt,
        url: `${SITE}${path}`,
        author: { "@type": "Organization", name: "IntegralStocks" },
        publisher: {
          "@type": "Organization",
          name: "IntegralStocks",
          logo: { "@type": "ImageObject", url: "https://integralstocks.com/favicon.png" },
        },
        mainEntityOfPage: `${SITE}${path}`,
      },
      breadcrumb([
        { name: "Home", item: `${SITE}/` },
        { name: "Blog", item: `${SITE}/blog` },
        { name: post.title, item: `${SITE}${path}` },
      ]),
    ],
    bodyHtml,
  });
}

// ---------- Run ----------

function main() {
  let written = 0;

  for (const r of [...staticRoutes, ...tickerRoutes]) {
    writePage(r.path, headOnlyPage(r));
    written++;
  }

  writePage("/learn/glossary", glossaryIndexPage());
  written++;
  for (const entry of GLOSSARY) {
    writePage(`/learn/glossary/${entry.slug}`, glossaryTermPage(entry));
    written++;
  }

  writePage("/faq", faqPage());
  written++;

  writePage("/blog", blogIndexPage());
  written++;
  for (const post of POSTS) {
    writePage(`/blog/${post.slug}`, blogPostPage(post));
    written++;
  }

  console.log(
    `prerender: wrote ${written} page(s) (${staticRoutes.length} static, ${tickerRoutes.length}/${collectTickers().length} tickers, ${GLOSSARY.length + 2} glossary, ${POSTS.length + 1} blog, 1 faq)`,
  );
}

main();
