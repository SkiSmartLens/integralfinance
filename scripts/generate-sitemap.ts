// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.

import { writeFileSync } from "fs";
import { resolve } from "path";
import { CATEGORIES, INDEX_TICKERS, TRENDING, SECTORS } from "../src/lib/categories";
import { POSTS } from "../src/content/blog";

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

// NOTE: We intentionally omit <lastmod> on pages without a page-specific,
// authoritative timestamp. A shared "today" or build-time value is not a
// real signal of content change, so we leave it out and rely on <changefreq>
// to hint update cadence to crawlers. Blog posts carry a real publishedAt.

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/stocks", changefreq: "hourly", priority: "0.9" },
  { path: "/news", changefreq: "hourly", priority: "0.9" },
  { path: "/screener", changefreq: "daily", priority: "0.8" },
  { path: "/calendar", changefreq: "daily", priority: "0.7" },
  { path: "/start", changefreq: "monthly", priority: "0.8" },
  { path: "/watchlist", changefreq: "weekly", priority: "0.6" },
  { path: "/simulator", changefreq: "weekly", priority: "0.8" },
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/disclaimer", changefreq: "yearly", priority: "0.3" },
  { path: "/data-sources", changefreq: "yearly", priority: "0.3" },
  { path: "/faq", changefreq: "monthly", priority: "0.5" },
  { path: "/auth", changefreq: "yearly", priority: "0.4" },
  { path: "/market-brief", changefreq: "daily", priority: "0.8" },
  { path: "/translate", changefreq: "monthly", priority: "0.7" },
  { path: "/blog", changefreq: "weekly", priority: "0.8" },
  { path: "/learn", changefreq: "monthly", priority: "0.8" },
  { path: "/learn/basics", changefreq: "monthly", priority: "0.7" },
  { path: "/learn/reading", changefreq: "monthly", priority: "0.7" },
  { path: "/learn/indicators", changefreq: "monthly", priority: "0.7" },
  { path: "/learn/patterns", changefreq: "monthly", priority: "0.7" },
  { path: "/learn/portfolio", changefreq: "monthly", priority: "0.7" },
  { path: "/learn/advanced", changefreq: "monthly", priority: "0.7" },
];

// Individual stock pages for every ticker referenced in the app's data.
const stockEntries: SitemapEntry[] = ALL_TICKERS.map((symbol) => ({
  path: `/stocks/${symbol.toLowerCase()}`,
  changefreq: "hourly",
  priority: "0.7",
}));

// Blog posts — real page-specific publishedAt is authoritative for lastmod.
const blogEntries: SitemapEntry[] = POSTS.map((p) => ({
  path: `/blog/${p.slug}`,
  lastmod: p.publishedAt,
  changefreq: "monthly",
  priority: "0.7",
}));

const entries = [...staticEntries, ...stockEntries, ...blogEntries];

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

