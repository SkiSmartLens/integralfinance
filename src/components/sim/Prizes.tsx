import { useState } from "react";
import { Loader2, Pencil, Plus, Trophy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_PRIZES, MAX_PRIZE_LENGTH, cleanPrizes, placeLabel } from "@/lib/prizes";

// Gold, silver and bronze for the top three; everyone after gets plain.
const MEDALS = [
  "bg-amber-400 text-amber-950",
  "bg-slate-300 text-slate-900",
  "bg-orange-300 text-orange-950",
];
const medal = (i: number) => MEDALS[i] ?? "bg-muted text-foreground";

/**
 * A game's prizes across the top of the simulator, so every player can see
 * what they're playing for. With `onSave` (for the game's creator and admins)
 * they can be added and changed right here; everyone else sees nothing until
 * there are prizes. `onSave` resolves true once saved.
 */
export const PrizeBanner = ({
  prizes,
  over,
  onSave,
}: {
  prizes: string[];
  over?: boolean;
  onSave?: (prizes: string[]) => Promise<boolean>;
}) => {
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  if (!prizes.length && !onSave) return null;

  // No prizes yet: an invitation, only for whoever can add them.
  if (!prizes.length && !draft) {
    return (
      <button
        type="button"
        onClick={() => setDraft([""])}
        className="w-full rounded-3xl border-2 border-dashed border-amber-300 dark:border-amber-800/70 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3 flex items-center gap-2.5 text-left hover:border-amber-500 transition-colors"
      >
        <span className="w-9 h-9 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center shrink-0">
          <Trophy className="w-5 h-5" />
        </span>
        <span className="min-w-0">
          <span className="block font-extrabold text-amber-950 dark:text-amber-100">Add prizes</span>
          <span className="block text-xs text-amber-900/80 dark:text-amber-200/80">
            Say what the top players win. Everyone in this game will see them here.
          </span>
        </span>
        <Plus className="ml-auto w-5 h-5 text-amber-700 dark:text-amber-300 shrink-0" />
      </button>
    );
  }

  const save = async () => {
    if (!draft || !onSave) return;
    setSaving(true);
    const saved = await onSave(cleanPrizes(draft));
    setSaving(false);
    if (saved) setDraft(null);
  };

  return (
    <section
      aria-label="Prizes"
      className="rounded-3xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 dark:border-amber-800/70 dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-amber-950/40 p-4 sm:p-5 shadow-sm"
    >
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center shrink-0">
          <Trophy className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-extrabold text-amber-950 dark:text-amber-100 leading-tight">Prizes</h2>
          <p className="text-xs text-amber-900/80 dark:text-amber-200/80">
            {draft
              ? "Everyone in this game sees these here."
              : over
              ? "This game has ended. Final places on the leaderboard win these."
              : `Finish ${prizes.length === 1 ? "1st" : `in the top ${prizes.length}`} on the leaderboard to win.`}
          </p>
        </div>
        {onSave && !draft && (
          <button
            type="button"
            onClick={() => setDraft(prizes)}
            className="ml-auto shrink-0 h-8 px-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-card/80 text-xs font-bold text-amber-900 dark:text-amber-100 hover:border-amber-500 inline-flex items-center gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit prizes
          </button>
        )}
      </div>
      {draft ? (
        <div className="mt-3 space-y-3">
          <PrizeEditor prizes={draft} onChange={setDraft} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-extrabold inline-flex items-center gap-2 disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save prizes
            </button>
            <button type="button" onClick={() => setDraft(null)} className="h-10 px-3 text-sm font-bold text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <ol className="mt-3 grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
          {prizes.map((p, i) => (
            <li key={i} className="flex items-center gap-2.5 rounded-2xl bg-card/90 border border-amber-200 dark:border-amber-900/60 px-3 py-2 min-w-0">
              <span className={cn("shrink-0 h-7 min-w-[2.75rem] px-1.5 rounded-lg text-xs font-extrabold flex items-center justify-center", medal(i))}>
                {placeLabel(i + 1)}
              </span>
              <span className="text-sm font-bold break-words min-w-0">{p}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

/** Typing in prizes, 1st place first, one row per place. */
export const PrizeEditor = ({ prizes, onChange }: { prizes: string[]; onChange: (prizes: string[]) => void }) => (
  <div className="space-y-2">
    {prizes.map((p, i) => (
      <div key={i} className="flex items-center gap-2">
        <span className={cn("shrink-0 h-10 w-14 rounded-xl text-xs font-extrabold flex items-center justify-center", medal(i))}>
          {placeLabel(i + 1)}
        </span>
        <input
          value={p}
          maxLength={MAX_PRIZE_LENGTH}
          onChange={(e) => onChange(prizes.map((x, j) => (j === i ? e.target.value : x)))}
          placeholder={i === 0 ? "e.g. $20 gift card" : "e.g. $10 gift card"}
          aria-label={`Prize for ${placeLabel(i + 1)} place`}
          className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-muted/60 border-2 border-transparent focus:border-primary/50 outline-none text-sm font-semibold"
        />
        <button
          type="button"
          onClick={() => onChange(prizes.filter((_, j) => j !== i))}
          className="shrink-0 h-10 w-10 rounded-xl border-2 text-muted-foreground hover:text-rose-600 hover:border-rose-300 flex items-center justify-center"
          aria-label={`Remove the ${placeLabel(i + 1)} place prize`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    ))}
    {prizes.length < MAX_PRIZES && (
      <button
        type="button"
        onClick={() => onChange([...prizes, ""])}
        className="h-10 px-3 rounded-xl border-2 border-dashed text-sm font-bold text-muted-foreground hover:text-primary hover:border-primary/60 inline-flex items-center gap-1.5"
      >
        <Plus className="w-4 h-4" /> Add a prize for {placeLabel(prizes.length + 1)} place
      </button>
    )}
  </div>
);
