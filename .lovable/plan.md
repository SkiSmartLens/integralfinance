This is a large batch. I'll do it in phases so you can review each. Please confirm before I start.

## Phase A — Quick fixes (news + ticker header)
- Ticker/SPY header: fix duplicate/conflicting % move vs chart number (single source of truth from live quote; chart shows range change separately or is labeled).
- News feed on `/` (SPY) and every `/stocks/:ticker` page: load a wider window (~5 min to 2 days old), add a **Show more stories** button (paginate `useLiveNews`), and add a **Read the blog →** button at the bottom of the news section.
- Fix empty `alt=""` in `NewsList.tsx` and `MarketBrief.tsx` (use headline as alt).

## Phase B — Image optimization
- Recompress `public/favicon.png` → ~32×32/64×64 PNG, few KB. Delete oversized version.
- Convert `src/assets/logo.png` + `src/assets/stocks-hero.jpg` to WebP (with `<picture>` fallback where used).
- Audit remaining `<img>` alts; add descriptive text or `alt=""` + `aria-hidden` for purely decorative.

## Phase C — Titles & meta descriptions
- Rewrite homepage `SEO` (SpyLanding) to beginner-AI + simulator positioning.
- Rewrite `StockTicker` meta to include company, ticker, sector/one live-ish detail (sector from `assetProfile` if available, else "stock analysis for beginners").
- Rewrite Jargon Translator meta for "stock market jargon explained" cluster.
- Rewrite Sim page meta for "stock market simulator for beginners" cluster.
- Sweep every other page using `SEO` — enforce unique title ≤60, description ≤155.

## Phase D — Heading structure
- Audit each page for exactly one `<h1>`, logical `h2`/`h3` nesting. Fix violators.

## Phase E — Blog + internal linking
- New content system: `src/content/blog/*.mdx` (or TS objects) + `/blog` index + `/blog/:slug` route with `SEO`, JSON-LD `Article`, related-stocks and related-jargon links.
- Seed 10 posts matching the exact queries you listed.
- Add reusable "Why did [ticker] stock move today" template (auto-generated page pattern at `/blog/why-did-:ticker-move-today` reading from the existing `WhyItMoved`/`stock-summary` logic).
- Add **Related articles** section on every `/stocks/:ticker` (filtered by ticker/sector tags in post frontmatter).
- Add **Related stocks** section on every blog post (linking `/stocks/:ticker`).
- Add `/blog` to `Header` nav (replaces or joins existing) and to `SiteFooter`.

## Phase F — Prerendering
- Add `vite-plugin-prerender` or a custom `scripts/prerender.ts` (Puppeteer/`react-snap` style) that walks known routes post-build and writes static HTML per route with the correct `<head>` from `react-helmet-async`.
- Update `scripts/generate-sitemap.ts` to enumerate all static routes + every blog slug + every seeded ticker so the sitemap matches prerendered output.

## Notes / risks
- Prerendering (Phase F) is the highest-risk change — it touches the build pipeline and can regress preview. I'll ship it last, isolated, and verify with a headless fetch of a couple of routes to confirm the raw HTML contains route-specific meta.
- "Live stat in ticker meta" is only reliable if we have static data at render time; since meta is client-side today, this will only become truly crawler-visible after Phase F. Until then the description will use sector/company text (still unique per ticker).
- Blog posts will be authored as real content — I'll write beginner-focused drafts (~600-900 words each) rather than thin stubs.

## Suggested order to ship
1. Phase A (small, high-impact, unblocks your immediate UX complaints)
2. Phase B + C + D together (all meta/asset polish, one review pass)
3. Phase E (blog system + 10 posts + internal linking)
4. Phase F (prerender + sitemap)

Reply "go A" (or "go all") and I'll start.
