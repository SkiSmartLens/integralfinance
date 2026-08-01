import { Link } from "react-router-dom";
import { GraduationCap, ArrowRight, X } from "lucide-react";
import { useState } from "react";
import { ACADEMY_MODULES, useAcademy } from "@/lib/academy";
import { cn } from "@/lib/utils";

interface Props {
  /** Which Academy module id is contextually relevant here. */
  moduleId: number;
  /** Optional custom prompt text; falls back to a sensible default. */
  hint?: string;
  className?: string;
}

/**
 * Inline nudge that appears on Trade / Ticker pages when the user
 * hasn't yet completed the relevant Academy module. Dismissible per session.
 */
export const AcademyPrompt = ({ moduleId, hint, className }: Props) => {
  const { isCompleted } = useAcademy();
  const [dismissed, setDismissed] = useState(false);
  const module = ACADEMY_MODULES.find((m) => m.id === moduleId);

  if (!module) return null;
  if (isCompleted(moduleId)) return null;
  if (dismissed) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-primary/30 bg-primary/5 p-3.5 flex items-start gap-3",
        className,
      )}
    >
      <div className="shrink-0 w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
        <GraduationCap className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground">
          New to this? · {module.duration}
        </div>
        <div className="font-extrabold text-sm mt-0.5">
          {hint ?? `Learn: ${module.title}`}
        </div>
        <Link
          to={`/academy/${module.id}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline mt-1"
        >
          Open lesson <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 -m-1 rounded-md hover:bg-black/5"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
};
