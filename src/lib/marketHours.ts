/**
 * US equity regular-session helpers.
 *
 * Yahoo's `marketState` is the source of truth when we have a quote, but quotes
 * can be missing/stale (empty watchlist, proxy hiccup) which used to make the UI
 * claim "market closed" while it was actually open. This clock check is the
 * fallback so the two never disagree in the wrong direction.
 */

/** Current wall-clock time in America/New_York as {day, minutes-since-midnight}. */
function etNow(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = get("weekday");
  const hour = Number(get("hour") === "24" ? "0" : get("hour"));
  const minute = Number(get("minute"));
  return { weekday, minutes: hour * 60 + minute };
}

/** True during 9:30am–4:00pm ET, Mon–Fri (holidays not accounted for). */
export function isUsMarketOpen(d = new Date()): boolean {
  const { weekday, minutes } = etNow(d);
  if (weekday === "Sat" || weekday === "Sun") return false;
  return minutes >= 9 * 60 + 30 && minutes < 16 * 60;
}

/** Human label for when the next regular session begins. */
export function nextOpenLabel(d = new Date()): string {
  const { weekday, minutes } = etNow(d);
  const isWeekend = weekday === "Sat" || weekday === "Sun";
  if (!isWeekend && minutes < 9 * 60 + 30) return "today at 9:30am ET";
  if (!isWeekend && weekday !== "Fri") return "tomorrow at 9:30am ET";
  return "Monday at 9:30am ET";
}
