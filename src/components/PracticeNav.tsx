import { NavLink } from "react-router-dom";
import { Trophy, LineChart, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/simulator", label: "Simulator", icon: Trophy },
  { to: "/screener", label: "Screener", icon: LineChart },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
];

/**
 * Sub-nav for the "Practice" section (Simulator + Screener + Calendar).
 * Signals the audience shift from beginner learning to hands-on practice tools.
 */
export const PracticeNav = () => (
  <div className="border-b bg-primary/5">
    <div className="container mx-auto px-4 flex items-center gap-1 overflow-x-auto no-scrollbar">
      <span className="text-[11px] uppercase tracking-wider font-bold text-primary/70 mr-2 shrink-0">
        Practice
      </span>
      {ITEMS.map((it) => {
        const Icon = it.icon;
        return (
          <NavLink
            key={it.to}
            to={it.to}
            end
            className={({ isActive }) =>
              cn(
                "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )
            }
          >
            <Icon className="w-4 h-4" />
            {it.label}
          </NavLink>
        );
      })}
    </div>
  </div>
);
