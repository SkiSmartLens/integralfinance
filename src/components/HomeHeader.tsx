import { Link, NavLink } from "react-router-dom";
import { TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/learn/basics", label: "Learn" },
  { to: "/simulator", label: "Simulator" },
  { to: "/#glossary", label: "Glossary" },
];

/** Minimal homepage header: logo left, three links center, Start Here button right. */
export const HomeHeader = () => (
  <header className="bg-background/80 backdrop-blur border-b sticky top-0 z-40">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
      <Link to="/" className="flex items-center gap-2 font-extrabold text-lg shrink-0">
        <TrendingUp className="text-primary" />
        <span>Integral Stocks</span>
      </Link>
      <nav className="hidden sm:flex items-center gap-1">
        {LINKS.map((l) =>
          l.to.startsWith("/#") ? (
            <a
              key={l.to}
              href={l.to}
              className="px-3.5 py-2 rounded-full text-sm font-bold text-foreground hover:bg-muted transition-colors"
            >
              {l.label}
            </a>
          ) : (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  "px-3.5 py-2 rounded-full text-sm font-bold transition-colors",
                  isActive ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-muted"
                )
              }
            >
              {l.label}
            </NavLink>
          )
        )}
      </nav>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          to="/stocks"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-primary text-primary text-sm font-bold hover:bg-accent transition-colors"
        >
          Skip to dashboard <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <Link
          to="/start"
          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-extrabold hover:opacity-90 transition-opacity"
        >
          <Sparkles className="w-3.5 h-3.5" /> Start Here
        </Link>
      </div>
    </div>
  </header>
);
