// Simulator game prizes: what each place on the leaderboard wins, 1st place
// first, in games.prizes (supabase/migrations/20261104150000_sim_rejoin_keeps_account_and_prizes.sql,
// photos from 20261104210000_sim_prize_photos.sql).

/** One prize: its name, and a small square photo (a data: URL) if it has one. */
export interface Prize {
  text: string;
  image?: string;
}

/** The database takes up to 10 prizes, names of up to 120 characters and photos of up to 60,000. */
export const MAX_PRIZES = 10;
export const MAX_PRIZE_LENGTH = 120;
export const MAX_PHOTO_LENGTH = 60_000;

const PHOTO = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;

/**
 * A game's prizes, 1st place first. Stored as the name alone, or as
 * {text, image} once one has a photo. Games from before prizes have none.
 */
export function prizeList(value: unknown): Prize[] {
  if (!Array.isArray(value)) return [];
  const out: Prize[] = [];
  for (const p of value) {
    if (typeof p === "string") {
      if (p.trim()) out.push({ text: p.trim() });
    } else if (p && typeof p === "object") {
      const { text, image } = p as { text?: unknown; image?: unknown };
      const name = typeof text === "string" ? text.trim() : "";
      const photo = typeof image === "string" && PHOTO.test(image) ? image : undefined;
      if (photo) out.push({ text: name, image: photo });
      else if (name) out.push({ text: name });
    }
  }
  return out;
}

/** Prizes as typed into an editor, ready to save: rows with neither a name nor a photo dropped. */
export function cleanPrizes(rows: Prize[]): Prize[] {
  return rows
    .map((p) => {
      const text = p.text.trim().slice(0, MAX_PRIZE_LENGTH);
      return p.image ? { text, image: p.image } : { text };
    })
    .filter((p) => p.text || p.image)
    .slice(0, MAX_PRIZES);
}

/**
 * How prizes are saved: a prize without a photo as its name alone, the way
 * every prize was saved before photos, so those still save on a database
 * without the photos update.
 */
export function storedPrizes(prizes: Prize[]): (string | { text: string; image: string })[] {
  return prizes.map((p) => (p.image ? { text: p.text, image: p.image } : p.text));
}

/** Why saving prizes was turned down, in plain words where it's the missing photos update. */
export function prizeSaveError(message: string, prizes: Prize[]): string {
  const oldRules = /games_prizes_list|each 1-120 characters/.test(message);
  return oldRules && prizes.some((p) => p.image)
    ? "Prize photos need the latest simulator database update, which hasn't been installed yet. Remove the photos to save the prizes for now."
    : message;
}

/** 1 → "1st", 2 → "2nd", 11 → "11th", 22 → "22nd". */
export function placeLabel(place: number): string {
  const teen = place % 100 >= 11 && place % 100 <= 13;
  const suffix = teen ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[place % 10] ?? "th";
  return `${place}${suffix}`;
}
