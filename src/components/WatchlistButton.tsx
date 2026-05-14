import { Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useWatchlist } from "@/hooks/useWatchlist";

/** Nav button that takes the user to the dedicated /watchlist page. */
export const WatchlistButton = () => {
  const { symbols } = useWatchlist();
  return (
    <Link
      to="/watchlist"
      className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-muted hover:bg-muted/70 shrink-0"
    >
      <Star className="w-4 h-4" />
      Watchlist
      {symbols.length > 0 && (
        <span className="text-[10px] bg-background/80 text-foreground rounded-full px-1.5 py-0.5">
          {symbols.length}
        </span>
      )}
    </Link>
  );
};
