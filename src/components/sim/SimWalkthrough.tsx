import { useEffect, useState } from "react";
import { X, ArrowRight, DoorOpen, TrendingUp, Trophy, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const STORAGE_KEY = "sim.walkthrough.v1";

export const hasSeenSimWalkthrough = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "done";
  } catch {
    return false;
  }
};

export const markSimWalkthroughSeen = () => {
  try {
    localStorage.setItem(STORAGE_KEY, "done");
  } catch {
    /* ignore */
  }
};

const STEPS = [
  {
    icon: DoorOpen,
    title: "Join or create a game",
    body:
      "Use the Lobby to start a solo game with $100k of virtual cash, or enter a join code from a friend or teacher.",
  },
  {
    icon: TrendingUp,
    title: "Place your first trade",
    body:
      "Search a ticker, choose Buy or Sell, pick how many shares, and tap the big button. Nothing is real — this is practice.",
  },
  {
    icon: Trophy,
    title: "Check the leaderboard",
    body:
      "See how you're ranked against everyone else in your game. Total equity (cash + holdings) sets your position.",
  },
  {
    icon: GraduationCap,
    title: "Learn as you go",
    body:
      "Stuck on a concept? The Academy has 3-minute lessons that unlock as you finish each one. Look for the Learn hub in the nav.",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * First-time simulator walkthrough — 4-step modal.
 * Persists a "seen" flag in localStorage; re-triggerable from the help button.
 */
export const SimWalkthrough = ({ open, onClose }: Props) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const s = STEPS[step];
  const Icon = s.icon;
  const last = step === STEPS.length - 1;

  const close = () => {
    markSimWalkthroughSeen();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sim-walk-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-6 animate-fade-in"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-card rounded-3xl border-2 shadow-xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-5 pt-5">
          <div className="flex gap-1.5 flex-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full flex-1 transition-colors",
                  i <= step ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
          <button
            onClick={close}
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
            aria-label="Close walkthrough"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 pt-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
            <Icon className="w-7 h-7" />
          </div>
          <div className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground mb-1">
            Step {step + 1} of {STEPS.length}
          </div>
          <h2 id="sim-walk-title" className="text-xl font-extrabold mb-2">
            {s.title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
        </div>

        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <button
            onClick={close}
            className="text-sm font-bold text-muted-foreground hover:text-foreground min-h-11 px-2"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {last ? (
              <>
                <Link
                  to="/learn"
                  onClick={close}
                  className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline min-h-11 px-2"
                >
                  Open Learn hub
                </Link>
                <button
                  onClick={close}
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-primary text-primary-foreground font-extrabold text-sm"
                >
                  Got it
                </button>
              </>
            ) : (
              <button
                onClick={() => setStep((n) => Math.min(STEPS.length - 1, n + 1))}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-primary text-primary-foreground font-extrabold text-sm"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
