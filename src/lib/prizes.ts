// Simulator game prizes: what each place on the leaderboard wins, 1st place
// first, in games.prizes (supabase/migrations/20261104150000_sim_rejoin_keeps_account_and_prizes.sql).

/** The database takes up to 10 prizes of up to 120 characters each. */
export const MAX_PRIZES = 10;
export const MAX_PRIZE_LENGTH = 120;

/** A game's prizes, 1st place first. Games from before prizes existed have none. */
export function prizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((p): p is string => typeof p === "string").map((p) => p.trim()).filter(Boolean);
}

/** Prizes as typed into an editor, ready to save: blank rows dropped. */
export function cleanPrizes(rows: string[]): string[] {
  return rows.map((p) => p.trim().slice(0, MAX_PRIZE_LENGTH)).filter(Boolean).slice(0, MAX_PRIZES);
}

/** 1 → "1st", 2 → "2nd", 11 → "11th", 22 → "22nd". */
export function placeLabel(place: number): string {
  const teen = place % 100 >= 11 && place % 100 <= 13;
  const suffix = teen ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[place % 10] ?? "th";
  return `${place}${suffix}`;
}
