This is a large build. I'll ship it in two phases so you get a working app fast and the heavy simulator second.

## Phase 1 — Chart, news split, analytics, pinch-compare (this turn)

**Chart upgrades (`StockChart.tsx`)**
- Replace smoothed `monotone` area with sharp `linear` interpolation (spiky, Yahoo-style).
- Add chart type toggle: **Mountain** (area), **Bar** (OHLC bars), **Candle** (candlesticks).
  - Bar/Candle pulled from chart endpoint's `indicators.quote[0]` (open/high/low/close already returned by the proxy — I'll surface them).
  - Built with recharts `ComposedChart` + custom `Bar`/`shape` for OHLC and candles.
- **Two-finger pinch-to-compare**: touch handlers on the chart container. When 2 touches are active, project both X positions to data points and overlay two vertical guides + a small badge showing `Δ$ / Δ%` between them. Releases reset.

**News split (`NewsList` + `Index.tsx`)**
- Tabs: **My News** | **General**.
- "My News" = OR-query of all watchlist symbols (`AAPL OR MSFT OR …`) sent to the existing news proxy.
- "General" = current category query (unchanged).

**Analytics**
- Install `@vercel/analytics` (the React build, not `/next`).
- Mount `<Analytics />` in `App.tsx`. Note: only reports when deployed to Vercel; harmless elsewhere.

## Phase 2 — Trading simulator (next turn, after Phase 1 ships)

Scope to match MarketWatch Virtual Stock Exchange:
- Auth (email + Google) — required for portfolios.
- Tables: `games`, `game_members`, `portfolios`, `positions`, `orders`, `transactions` with RLS so members only see their game.
- $100k starting cash, market/limit/stop orders, after-hours window (orders queued, filled at next session price via cron edge function).
- Pages: `/sim` (dashboard: cash, positions, P&L), `/sim/trade/:symbol` (order ticket), `/sim/games` (create/join with code), `/sim/leaderboard/:gameId`.
- Order fills via edge function using existing `yahoo-proxy` for live + post-market prices.

I'll confirm Phase 2 details (game settings, commissions, short selling on/off) when we start it — building it all in one shot would be unstable.

## Technical notes
- Pinch handler uses `pointerdown/move/up` with `pointerType==='touch'`, tracking up to 2 active pointers; falls back gracefully on desktop (Shift+drag to measure).
- Candlestick: custom `shape` prop on a `Bar` that draws wick line + body rect, green/red by close vs open.
- No backend changes needed in Phase 1 — proxy already returns OHLC arrays.