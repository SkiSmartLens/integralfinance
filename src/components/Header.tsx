import { Search, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

interface Props {
  onSearch?: (sym: string) => void;
}

export const Header = ({ onSearch }: Props) => {
  const [q, setQ] = useState("");
  const nav = useNavigate();
  return (
    <header className="bg-card border-b">
      <div className="container mx-auto px-4 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <TrendingUp className="text-primary" />
          <span>IntegralFinance</span>
        </Link>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const sym = q.trim().toUpperCase();
            if (!sym) return;
            if (onSearch) onSearch(sym);
            else nav(`/?symbol=${sym}`);
          }}
          className="flex-1 max-w-xl relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search for symbols (AAPL, BTC-USD, ^GSPC)..."
            className="w-full pl-9 pr-4 py-2 bg-muted border border-transparent focus:border-primary focus:bg-background rounded-md text-sm outline-none transition-all"
          />
        </form>
      </div>
    </header>
  );
};
