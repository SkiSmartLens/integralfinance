// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.

import { writeFileSync } from "fs";
import { resolve } from "path";
import { ALL_TICKERS } from "../src/lib/categories";
import { POSTS } from "../src/content/blog";
import { GLOSSARY } from "../src/content/glossary";

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
  // "/news" is an alias route that self-canonicalizes to "/market-brief" (same
  // component); only the canonical URL belongs in the sitemap.
  { path: "/screener", changefreq: "daily", priority: "0.8" },
  { path: "/calendar", changefreq: "daily", priority: "0.7" },
  { path: "/start", changefreq: "monthly", priority: "0.8" },
  // "/watchlist" is omitted: it's per-visitor (empty for a crawler) and noindexed.
  { path: "/simulator", changefreq: "weekly", priority: "0.8" },
  { path: "/academy", changefreq: "monthly", priority: "0.7" },
  { path: "/academy/1", changefreq: "monthly", priority: "0.5" },
  // "/sim" is omitted: it's a signed-in game view that sends visitors to /auth.
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/disclaimer", changefreq: "yearly", priority: "0.3" },
  { path: "/data-sources", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/affiliate-disclosure", changefreq: "yearly", priority: "0.3" },
  { path: "/faq", changefreq: "monthly", priority: "0.5" },
  // "/auth" is intentionally omitted: robots.txt disallows it, and a sitemap
  // should only list URLs crawlers are allowed to index.
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
  { path: "/learn/glossary", changefreq: "monthly", priority: "0.7" },
];

// Individual stock pages for every ticker referenced in the app's data.
const stockEntries: SitemapEntry[] = ALL_TICKERS.map((symbol) => ({
  // `^` (index tickers like ^GSPC) isn't a legal URL character — percent-encode it.
  path: `/stocks/${symbol.toLowerCase().replace(/\^/g, "%5E")}`,
  changefreq: "hourly",
  priority: "0.7",
}));

// One page per glossary term.
const glossaryEntries: SitemapEntry[] = GLOSSARY.map((g) => ({
  path: `/learn/glossary/${g.slug}`,
  changefreq: "yearly",
  priority: "0.6",
}));

// Blog posts — real page-specific publishedAt is authoritative for lastmod.
const blogEntries: SitemapEntry[] = POSTS.map((p) => ({
  path: `/blog/${p.slug}`,
  lastmod: p.publishedAt,
  changefreq: "monthly",
  priority: "0.7",
}));

const entries = [...staticEntries, ...stockEntries, ...glossaryEntries, ...blogEntries];

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

