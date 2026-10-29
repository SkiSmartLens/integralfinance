import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { AI_STEPS, aiProgressAt } from "@/lib/aiProgress";

/**
 * A progress bar and what the AI is doing while insights are generated. The
 * full version also lists every step, ticking off the ones already done; the
 * compact one (for small cards) shows only the current step.
 */
export const AiProgress = ({ compact = false, className }: { compact?: boolean; className?: string }) => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - start), 200);
    return () => clearInterval(id);
  }, []);
  const { percent, step, slow } = aiProgressAt(elapsed);

  return (
    <div className={cn("py-1", className)}>
      <p className="flex items-center gap-2 text-sm font-medium" role="status">
        <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
        {AI_STEPS[step].label}…
      </p>
      <Progress value={percent} aria-label="Generating AI insights" className="h-2 mt-2" />
      {!compact && (
        <ol className="mt-3 space-y-1 text-xs" aria-hidden="true">
          {AI_STEPS.map((s, i) => (
            <li
              key={s.label}
              className={cn(
                "flex items-center gap-2",
                i < step ? "text-muted-foreground" : i === step ? "text-foreground font-semibold" : "text-muted-foreground/50",
              )}
            >
              {i < step ? (
                <Check className="w-3.5 h-3.5 text-up shrink-0" />
              ) : (
                <span className={cn("w-1.5 h-1.5 mx-1 rounded-full shrink-0", i === step ? "bg-primary" : "bg-muted-foreground/30")} />
              )}
              {s.label}
            </li>
          ))}
        </ol>
      )}
      {slow && (
        <p className="text-xs text-muted-foreground mt-2">
          Taking longer than usual because the AI is busy. Hang tight.
        </p>
      )}
    </div>
  );
};
