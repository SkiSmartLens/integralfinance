// Global action bus the AI assistant uses to drive the app.
// Components register listeners; the AI dispatches typed actions.

export type AppAction =
  | { type: "navigate"; path: string }
  | { type: "setCategory"; id: string; sub?: string }
  | { type: "selectSymbol"; symbol: string }
  | { type: "addWidget"; id: string }
  | { type: "removeWidget"; id: string }
  | { type: "reorderWidgets"; order: string[] }
  | { type: "resetWidgets" }
  | { type: "addToWatchlist"; symbol: string }
  | { type: "removeFromWatchlist"; symbol: string }
  | { type: "scrollTo"; target: string }
  | { type: "toggleTheme" };

const bus = new EventTarget();
const EVT = "app:action";

export function dispatchAction(action: AppAction) {
  bus.dispatchEvent(new CustomEvent(EVT, { detail: action }));
}

export function onAction(handler: (a: AppAction) => void) {
  const fn = (e: Event) => handler((e as CustomEvent).detail as AppAction);
  bus.addEventListener(EVT, fn);
  return () => bus.removeEventListener(EVT, fn);
}

/** All actions the AI may emit. Used in the system prompt & validator. */
export const AI_ACTION_CATALOG = [
  { type: "navigate", args: { path: "string (e.g. /screener, /sim, /watchlist, /calendar, /)" }, desc: "Go to a route." },
  { type: "setCategory", args: { id: "category id (news, markets, tech, crypto, energy, finance, healthcare, consumer, world, commodities, currencies, politics, ai, ev)", sub: "optional sub-topic id" }, desc: "Switch the dashboard category tab." },
  { type: "selectSymbol", args: { symbol: "ticker e.g. AAPL" }, desc: "Load a stock into the main chart." },
  { type: "addWidget", args: { id: "top_gainers | top_losers | most_active | trending | sectors | indices | my_watchlist" }, desc: "Add a widget to the dashboard." },
  { type: "removeWidget", args: { id: "widget id" }, desc: "Remove a widget." },
  { type: "reorderWidgets", args: { order: "string[] of widget ids in desired order" }, desc: "Reorder widgets." },
  { type: "resetWidgets", args: {}, desc: "Restore default widget set." },
  { type: "addToWatchlist", args: { symbol: "ticker" }, desc: "Add a ticker to the user's watchlist." },
  { type: "removeFromWatchlist", args: { symbol: "ticker" }, desc: "Remove from watchlist." },
  { type: "scrollTo", args: { target: "section id" }, desc: "Scroll to a section." },
] as const;
