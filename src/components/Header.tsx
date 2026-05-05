import { Search, TrendingUp } from "lucide-react";
import { useState } from "react";

interface Props {
  onSearch: (sym: string) => void;
}

export const Header = ({ onSearch }: Props) => {
  const [q, setQ] = useState("");
  return (
    <header className="bg-card border-b">
      <div className="container mx-auto px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2 font-bold text-xl">
          <TrendingUp className="text-primary" />
          <span>FinPulse</span>
        </div>
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
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse" />
          Live data
        </div>
      </div>
    </header>
  );
};
