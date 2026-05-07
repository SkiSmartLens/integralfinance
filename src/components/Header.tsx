import { Search, TrendingUp, LineChart } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

interface Props {
  onSearch: (sym: string) => void;
}

export const Header = ({ onSearch }: Props) => {
  const [q, setQ] = useState("");
  return (
    <header className="bg-card border-b">
      <div className="container mx-auto px-4 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <TrendingUp className="text-primary" />
          <span>FinPulse</span>
        </Link>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) onSearch(q.trim().toUpperCase());
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
        <Link to="/sim" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
          <LineChart className="w-4 h-4" />
          <span className="hidden sm:inline">Simulator</span>
        </Link>
      </div>
    </header>
  );
};
