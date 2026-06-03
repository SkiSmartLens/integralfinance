import { Search, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { fetchSearchQuotes, SearchQuote } from "@/lib/yahoo";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

const NAV_LINKS = [
  { to: "/stocks", label: "Stocks" },
  { to: "/news", label: "News" },
  { to: "/sim", label: "Simulator", accent: true },
  { to: "/start", label: "Start Here" },
];

interface Props {
  onSearch?: (sym: string) => void;
}

export const Header = ({ onSearch }: Props) => {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchQuote[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const nav = useNavigate();
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced autocomplete
  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const r = await fetchSearchQuotes(term, 8);
        setResults(r.filter((x) => x.symbol));
        setHighlight(0);
      } catch {
        /* ignore */
      }
    }, 180);
    return () => clearTimeout(handle);
  }, [q]);

  // Click outside closes
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (sym: string) => {
    const s = sym.toUpperCase();
    setQ("");
    setOpen(false);
    setResults([]);
    if (onSearch) onSearch(s);
    else nav(`/?symbol=${s}`);
  };

  return (
    <header className="bg-card border-b">
      <div className="container mx-auto px-4 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl shrink-0">
          <img src={logo} alt="IntegralStocks" className="h-14 w-auto max-w-[72px] sm:h-16 sm:max-w-[84px]" />
          <span className="hidden sm:inline">Integral Stocks</span>
        </Link>
        <div ref={boxRef} className="flex-1 max-w-xl relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (open && results[highlight]) return pick(results[highlight].symbol);
              const sym = q.trim().toUpperCase();
              if (sym) pick(sym);
            }}
            className="relative"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (!open || !results.length) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlight((h) => Math.min(h + 1, results.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlight((h) => Math.max(h - 1, 0));
                } else if (e.key === "Escape") setOpen(false);
              }}
              placeholder="Search symbols or companies (Apple, AAPL, BTC)…"
              className="w-full pl-9 pr-4 py-2 bg-muted border border-transparent focus:border-primary focus:bg-background rounded-md text-sm outline-none transition-all"
            />
          </form>
          {open && results.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
              {results.map((r, i) => (
                <button
                  key={`${r.symbol}-${i}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(r.symbol);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  className={cn(
                    "w-full text-left px-3 py-2 flex items-center justify-between gap-3 text-sm",
                    i === highlight ? "bg-accent" : "hover:bg-accent/60",
                  )}
                >
                  <div className="min-w-0">
                    <div className="font-semibold">{r.symbol}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.longname || r.shortname || r.typeDisp || ""}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{r.exchDisp || r.quoteType || ""}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <nav className="hidden md:flex items-center gap-1 shrink-0">
          {NAV_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  "px-3.5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors",
                  l.accent
                    ? "bg-primary text-primary-foreground shadow-sm hover:opacity-90"
                    : isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground hover:bg-muted",
                )
              }
            >
              {l.label === "Start Here" && <Sparkles className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />}
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <nav className="md:hidden border-t flex items-stretch overflow-x-auto no-scrollbar">
        {NAV_LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              cn(
                "min-w-max flex-1 text-center px-4 py-2.5 text-sm font-bold whitespace-nowrap transition-colors",
                l.accent ? "text-primary bg-primary/10 font-extrabold" : isActive ? "text-foreground bg-muted" : "text-muted-foreground",
              )
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
};
