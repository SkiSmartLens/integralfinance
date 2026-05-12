import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { LineChart, Filter, Calendar } from "lucide-react";
import { WatchlistButton } from "@/components/WatchlistButton";

interface Props {
  active: string;
  onChange: (id: string) => void;
  activeSub?: string;
  onSubChange?: (subId: string | undefined) => void;
}

export const CategoryNav = ({ active, onChange, activeSub, onSubChange }: Props) => {
  const activeCat = CATEGORIES.find((c) => c.id === active);
  const subs = activeCat?.subTopics ?? [];

  return (
    <div className="border-b bg-background sticky top-0 z-30">
      <div className="container mx-auto px-4">
        <div className="flex gap-1 overflow-x-auto no-scrollbar py-2 items-center">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => onChange(c.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                active === c.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {c.label}
            </button>
          ))}
          <WatchlistButton />
          <Link
            to="/calendar"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-muted hover:bg-muted/70"
          >
            <Calendar className="w-4 h-4" />
            Calendar
          </Link>
          <Link
            to="/screener"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-muted hover:bg-muted/70"
          >
            <Filter className="w-4 h-4" />
            Screener
          </Link>
          <Link
            to="/sim"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-primary text-primary-foreground hover:opacity-90"
          >
            <LineChart className="w-4 h-4" />
            Simulator
          </Link>
        </div>
        {subs.length > 0 && (
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-2 -mt-1 items-center">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground pr-2 shrink-0">
              {activeCat?.label}:
            </span>
            <button
              onClick={() => onSubChange?.(undefined)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                !activeSub
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              All
            </button>
            {subs.map((s) => (
              <button
                key={s.id}
                onClick={() => onSubChange?.(s.id)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                  activeSub === s.id
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
