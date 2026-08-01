// Build-time prerendering (runs as a `postbuild` hook).
//
// The app is a client-rendered SPA, so crawlers that don't execute JS see only
// the shell in dist/index.html. This script writes a static HTML file per
// public route with route-specific <title>, description, canonical and og:*
// tags baked into the head, while still booting the full React app.
//
// Pages are hard-capped so the published build can never blow past hosting
// limits (50,000 files / 3 GiB).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { CATEGORIES, INDEX_TICKERS, TRENDING, SECTORS } from "../src/lib/categories";
import { POSTS } from "../src/content/blog";

const SITE = "https://integralstocks.com";
const DIST = resolve("dist");
const MAX_PRERENDER_PAGES = Number(process.env.MAX_PRERENDER_PAGES ?? 800);

interface Route {
  path: string;
  title: string;
  description: string;
}

const staticRoutes: Route[] = [
  {
    path: "/",
    title: "Learn to Invest — AI Stock Analysis for Beginners",
    description:
      "Beginner-friendly AI stock analysis, plain-English explainers, live S&P 500 signals, and a risk-free simulator to practice before you invest.",
  },
  {
    path: "/dashboard",
    title: "Dashboard — Learn Investing & Practice Trading",
    description:
      "Your investing dashboard: live prices, plain-English AI explainers, a watchlist, and a risk-free trading simulator built for beginners.",
  },
  {
    path: "/stocks",
    title: "Stocks — Live Prices & Beginner Explainers",
    description:
      "Browse live stock prices with plain-English AI breakdowns of why each stock is moving today. Built for first-time investors.",
  },
  {
    path: "/news",
    title: "Stock Market News — Latest Stories, Explained",
    description:
      "The latest stock market news, refreshed continuously and paired with beginner-friendly AI explanations of what each story means.",
  },
  {
    path: "/blog",
    title: "Investing Blog — Beginner Guides & Explainers",
    description:
      "Plain-English investing guides: how to start with $100, reading charts, managing risk, and building a long-term portfolio.",
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
  { path: "/simulator", title: "Free Stock Market Simulator for Beginners", description: "Practice trading with virtual cash. Real live prices, zero risk, and AI feedback explaining every trade you make." },
  { path: "/screener", title: "Stock Screener — Find Stocks by Filter", description: "Filter stocks by price, movement and volume with a simple screener designed for people new to investing." },
  { path: "/calendar", title: "Earnings & Market Calendar", description: "Upcoming earnings dates and market events, with plain-English notes on why each one can move prices." },
  { path: "/watchlist", title: "Your Stock Watchlist", description: "Track the stocks you care about with live prices and AI explanations of each day's move." },
  { path: "/market-brief", title: "Daily Market Brief — Today in 2 Minutes", description: "A short daily read on what moved the market today and why, written for beginners rather than traders." },
  { path: "/translate", title: "Jargon Translator — Finance Terms in Plain English", description: "Paste any confusing finance sentence and get a plain-English translation instantly. No jargon left behind." },
  { path: "/start", title: "Start Here — Your First Steps in Investing", description: "Two quick questions and we'll point you at the right first lesson, first chart and first practice trade." },
  { path: "/about", title: "About IntegralStocks", description: "Why we built a beginner-first investing site: live data, plain-English AI explainers and risk-free practice." },
  { path: "/contact", title: "Contact IntegralStocks", description: "Questions, feedback or partnership ideas? Get in touch with the IntegralStocks team." },
  { path: "/faq", title: "FAQ — IntegralStocks", description: "Answers to common questions about our data, AI explainers, simulator and accounts." },
  { path: "/data-sources", title: "Data Sources & Methodology", description: "Where our market data comes from, how often it refreshes, and how our AI explanations are grounded." },
  { path: "/disclaimer", title: "Disclaimer — Not Financial Advice", description: "IntegralStocks is educational. Nothing on this site is financial advice or a recommendation to buy or sell." },
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

const blogRoutes: Route[] = POSTS.map((p) => ({
  path: `/blog/${p.slug}`,
  title: p.title.length > 60 ? `${p.title.slice(0, 57)}...` : p.title,
  description: p.description,
}));

const tickerRoutes: Route[] = collectTickers().map((symbol) => ({
  path: `/stocks/${symbol.toLowerCase()}`,
  title: `${symbol} Stock Price & Chart | IntegralStocks`,
  description: `${symbol} live chart plus a plain-English AI breakdown of why the stock is moving today. Beginner-friendly, updated continuously.`,
}));

// Highest-value pages first; the long tail stays dynamic (still in sitemap.xml).
const allRoutes = [...staticRoutes, ...blogRoutes, ...tickerRoutes];
const routes = allRoutes.slice(0, MAX_PRERENDER_PAGES);

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

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

function main() {
  const shellPath = resolve(DIST, "index.html");
  if (!existsSync(shellPath)) {
    console.warn("prerender: dist/index.html not found — skipping");
    return;
  }
  const shell = readFileSync(shellPath, "utf8");

  let written = 0;
  for (const r of routes) {
    // Strip the shell's own head tags we are replacing, then inject ours.
    let html = shell
      .replace(/<title>[\s\S]*?<\/title>/i, "")
      .replace(/<meta\s+name="description"[^>]*>/gi, "")
      .replace(/<link\s+rel="canonical"[^>]*>/gi, "")
      .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, "")
      .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, "");

    html = html.replace(/<\/head>/i, `    ${headFor(r)}\n  </head>`);

    const outPath =
      r.path === "/" ? resolve(DIST, "index.html") : resolve(DIST, `.${r.path}/index.html`);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html);
    written++;
  }

  console.log(
    `prerender: wrote ${written} page(s) (cap ${MAX_PRERENDER_PAGES}, ${allRoutes.length} candidate routes)`,
  );
}

main();
