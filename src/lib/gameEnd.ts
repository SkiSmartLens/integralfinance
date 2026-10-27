/**
 * How long until a simulator game ends, in calendar days on the player's own
 * clock: "Ends today", "Ends tomorrow", "Ends in 5 days", or "Game over" once
 * the end time has passed. Null for games with no end date.
 */
export function gameEndLabel(
  endsAt: string | null | undefined,
  now = new Date(),
): { label: string; days: number; over: boolean } | null {
  if (!endsAt) return null;
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return null;
  if (end.getTime() <= now.getTime()) return { label: "Game over", days: 0, over: true };
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  // Rounded, since a day with a daylight-saving change is 23 or 25 hours long.
  const days = Math.round((midnight(end) - midnight(now)) / 86_400_000);
  const label = days === 0 ? "Ends today" : days === 1 ? "Ends tomorrow" : `Ends in ${days} days`;
  return { label, days, over: false };
}
