import { useRef, useState } from "react";
import { ImagePlus, Loader2, Pencil, Plus, Trophy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_PRIZES, MAX_PRIZE_LENGTH, cleanPrizes, placeLabel, type Prize } from "@/lib/prizes";
import { PrizePhotoCropper } from "./PrizePhotoCropper";

// Gold, silver and bronze for the top three; everyone after gets plain.
const MEDALS = [
  "bg-amber-400 text-amber-950",
  "bg-slate-300 text-slate-900",
  "bg-orange-300 text-orange-950",
];
const medal = (i: number) => MEDALS[i] ?? "bg-muted text-foreground";

/**
 * A game's prizes across the top of the simulator, so every player can see
 * what they're playing for: one small box each, with its photo, side by side.
 * With `onSave` (for the game's creator and admins) they can be added and
 * changed right here; everyone else sees nothing until there are prizes.
 * `onSave` resolves true once saved.
 */
export const PrizeBanner = ({
  prizes,
  over,
  onSave,
}: {
  prizes: Prize[];
  over?: boolean;
  onSave?: (prizes: Prize[]) => Promise<boolean>;
}) => {
  const [draft, setDraft] = useState<Prize[] | null>(null);
  const [saving, setSaving] = useState(false);
  if (!prizes.length && !onSave) return null;

  // No prizes yet: an invitation, only for whoever can add them.
  if (!prizes.length && !draft) {
    return (
      <button
        type="button"
        onClick={() => setDraft([{ text: "" }])}
        className="w-full rounded-3xl border-2 border-dashed border-amber-300 dark:border-amber-800/70 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3 flex items-center gap-2.5 text-left hover:border-amber-500 transition-colors"
      >
        <span className="w-9 h-9 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center shrink-0">
          <Trophy className="w-5 h-5" />
        </span>
        <span className="min-w-0">
          <span className="block font-extrabold text-amber-950 dark:text-amber-100">Add prizes</span>
          <span className="block text-xs text-amber-900/80 dark:text-amber-200/80">
            Say what the top players win, with a photo if you like. Everyone in this game will see them here.
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

  // Every box the same shape: a square photo area when any prize has a
  // photo (a trophy stands in for those without), a short strip otherwise.
  const photos = prizes.some((p) => p.image);

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
        <ol className="mt-3 flex flex-wrap gap-3">
          {prizes.map((p, i) => (
            <li
              key={i}
              className="w-[calc(50%-0.375rem)] sm:w-44 rounded-2xl bg-card border border-amber-200 dark:border-amber-900/60 overflow-hidden flex flex-col shadow-sm"
            >
              <div className={cn("relative bg-amber-100/70 dark:bg-amber-950/40", photos ? "aspect-square" : "h-14")}>
                {p.image ? (
                  <img src={p.image} alt={p.text || `${placeLabel(i + 1)} place prize`} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <Trophy className={cn("absolute inset-0 m-auto text-amber-500/70", photos ? "w-12 h-12" : "w-6 h-6")} />
                )}
                <span className={cn("absolute top-2 left-2 h-6 px-2 rounded-md text-xs font-extrabold flex items-center shadow-sm", medal(i))}>
                  {placeLabel(i + 1)}
                </span>
              </div>
              {p.text && <p className="px-2.5 py-2 text-sm font-bold leading-snug break-words">{p.text}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

/**
 * Typing in prizes, 1st place first, one row per place, each with an
 * optional photo that's cropped to a square as it's added.
 */
export const PrizeEditor = ({ prizes, onChange }: { prizes: Prize[]; onChange: (prizes: Prize[]) => void }) => {
  const fileInput = useRef<HTMLInputElement>(null);
  // The row a photo is being chosen for, and the photo in the cropper (a new
  // file, or the row's own photo to adjust).
  const [pickingFor, setPickingFor] = useState<number | null>(null);
  const [cropping, setCropping] = useState<{ row: number; src: string; newFile: boolean } | null>(null);

  const update = (row: number, change: Partial<Prize>) => onChange(prizes.map((p, j) => (j === row ? { ...p, ...change } : p)));
  const choosePhoto = (row: number) => {
    setPickingFor(row);
    fileInput.current?.click();
  };
  const closeCropper = () => {
    if (cropping?.newFile) URL.revokeObjectURL(cropping.src);
    setCropping(null);
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file || pickingFor == null) return;
          if (cropping?.newFile) URL.revokeObjectURL(cropping.src);
          setCropping({ row: pickingFor, src: URL.createObjectURL(file), newFile: true });
        }}
      />
      {prizes.map((p, i) => {
        const place = placeLabel(i + 1);
        return (
          <div key={i} className="flex items-center gap-2">
            <span className={cn("shrink-0 h-10 w-12 rounded-xl text-xs font-extrabold flex items-center justify-center", medal(i))}>
              {place}
            </span>
            <button
              type="button"
              onClick={() => (p.image ? setCropping({ row: i, src: p.image, newFile: false }) : choosePhoto(i))}
              title={p.image ? "Adjust or change the photo" : "Add a photo"}
              aria-label={p.image ? `Adjust or change the ${place} place photo` : `Add a photo for ${place} place`}
              className={cn(
                "shrink-0 h-10 w-10 rounded-xl overflow-hidden flex items-center justify-center transition-colors",
                p.image ? "border-2 border-transparent hover:border-primary" : "border-2 border-dashed text-muted-foreground hover:border-primary hover:text-primary",
              )}
            >
              {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="w-4 h-4" />}
            </button>
            <input
              value={p.text}
              maxLength={MAX_PRIZE_LENGTH}
              onChange={(e) => update(i, { text: e.target.value })}
              placeholder={p.image ? "Name (optional)" : i === 0 ? "e.g. $20 gift card" : "e.g. $10 gift card"}
              aria-label={`Prize for ${place} place`}
              className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-muted/60 border-2 border-transparent focus:border-primary/50 outline-none text-sm font-semibold"
            />
            <button
              type="button"
              onClick={() => onChange(prizes.filter((_, j) => j !== i))}
              className="shrink-0 h-10 w-10 rounded-xl border-2 text-muted-foreground hover:text-rose-600 hover:border-rose-300 flex items-center justify-center"
              aria-label={`Remove the ${place} place prize`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
      {prizes.length < MAX_PRIZES && (
        <button
          type="button"
          onClick={() => onChange([...prizes, { text: "" }])}
          className="h-10 px-3 rounded-xl border-2 border-dashed text-sm font-bold text-muted-foreground hover:text-primary hover:border-primary/60 inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add a prize for {placeLabel(prizes.length + 1)} place
        </button>
      )}
      {cropping && (
        <PrizePhotoCropper
          src={cropping.src}
          title={`Photo for the ${placeLabel(cropping.row + 1)} place prize`}
          onDone={(photo) => {
            update(cropping.row, { image: photo });
            closeCropper();
          }}
          onCancel={closeCropper}
          onChooseAnother={() => choosePhoto(cropping.row)}
          onRemove={
            prizes[cropping.row]?.image
              ? () => {
                  update(cropping.row, { image: undefined });
                  closeCropper();
                }
              : undefined
          }
        />
      )}
    </div>
  );
};
