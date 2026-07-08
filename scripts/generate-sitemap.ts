// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.

import { writeFileSync } from "fs";
import { resolve } from "path";
import { CATEGORIES, INDEX_TICKERS, TRENDING, SECTORS } from "../src/lib/categories";

// Collect every ticker referenced anywhere in the app's data.
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

const ALL_TICKERS = collectTickers();

const BASE_URL = "https://integralstocks.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const today = new Date().toISOString().slice(0, 10);
// Pages whose content changes frequently get today's date as lastmod.
const dynamicLastmod = today;
// Mostly-static informational pages keep an older, stable lastmod.
const staticLastmod = "2026-05-28";

const staticEntries: SitemapEntry[] = [
  { path: "/", lastmod: dynamicLastmod, changefreq: "daily", priority: "1.0" },
  { path: "/stocks", lastmod: dynamicLastmod, changefreq: "hourly", priority: "0.9" },
  { path: "/news", lastmod: dynamicLastmod, changefreq: "hourly", priority: "0.9" },
  { path: "/screener", lastmod: dynamicLastmod, changefreq: "daily", priority: "0.8" },
  { path: "/calendar", lastmod: dynamicLastmod, changefreq: "daily", priority: "0.7" },
  { path: "/start", lastmod: staticLastmod, changefreq: "monthly", priority: "0.8" },
  { path: "/watchlist", lastmod: staticLastmod, changefreq: "weekly", priority: "0.6" },
  { path: "/simulator", lastmod: staticLastmod, changefreq: "weekly", priority: "0.8" },
  { path: "/about", lastmod: staticLastmod, changefreq: "monthly", priority: "0.6" },
  { path: "/contact", lastmod: staticLastmod, changefreq: "monthly", priority: "0.5" },
  { path: "/disclaimer", lastmod: staticLastmod, changefreq: "yearly", priority: "0.3" },
  { path: "/data-sources", lastmod: staticLastmod, changefreq: "yearly", priority: "0.3" },
  { path: "/faq", lastmod: staticLastmod, changefreq: "monthly", priority: "0.5" },
  { path: "/auth", lastmod: staticLastmod, changefreq: "yearly", priority: "0.4" },
  { path: "/market-brief", lastmod: dynamicLastmod, changefreq: "daily", priority: "0.8" },
  { path: "/translate", lastmod: staticLastmod, changefreq: "monthly", priority: "0.7" },
  { path: "/learn", lastmod: staticLastmod, changefreq: "monthly", priority: "0.8" },
  { path: "/learn/basics", lastmod: staticLastmod, changefreq: "monthly", priority: "0.7" },
  { path: "/learn/reading", lastmod: staticLastmod, changefreq: "monthly", priority: "0.7" },
  { path: "/learn/indicators", lastmod: staticLastmod, changefreq: "monthly", priority: "0.7" },
  { path: "/learn/patterns", lastmod: staticLastmod, changefreq: "monthly", priority: "0.7" },
  { path: "/learn/portfolio", lastmod: staticLastmod, changefreq: "monthly", priority: "0.7" },
  { path: "/learn/advanced", lastmod: staticLastmod, changefreq: "monthly", priority: "0.7" },
];

// Individual stock pages for every ticker referenced in the app's data.
const stockEntries: SitemapEntry[] = ALL_TICKERS.map((symbol) => ({
  path: `/stocks/${symbol.toLowerCase()}`,
  lastmod: dynamicLastmod,
  changefreq: "hourly",
  priority: "0.7",
}));

const entries = [...staticEntries, ...stockEntries];

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
console.log(`sitemap.xml written (${entries.length} entries)`);
