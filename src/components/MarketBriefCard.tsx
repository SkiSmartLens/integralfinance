import { Link } from "react-router-dom";
import { ArrowRight, Newspaper } from "lucide-react";
import { BRIEF_INDICES, timeAgo, useMarketBrief } from "@/lib/marketBrief";
import { ScreenerQuote } from "@/lib/yahoo";
import { cn } from "@/lib/utils";

const pctText = (pct?: number) => (pct == null ? "—" : `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`);

const MOOD = {
  up: "Gainers are outpacing losers today.",
  down: "Losers are outpacing gainers today.",
  mixed: "A mixed day: gainers and losers are evenly matched.",
};

/**
 * A compact Daily Market Brief, pinned to the top of a watchlist. It has no
 * outer border: it's the first block inside the list it sits in.
 *
 * onSymbol: what tapping a top mover does (e.g. open it in the simulator).
 * Without it, movers link to the stock's page.
 */
export const MarketBriefCard = ({
  onSymbol,
  className,
}: {
  onSymbol?: (symbol: string) => void;
  className?: string;
}) => {
  const brief = useMarketBrief();
  const date = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const headlines = brief?.news.slice(0, 2) ?? [];
  const movers = [...(brief?.gainers.slice(0, 2) ?? []), ...(brief?.losers.slice(0, 2) ?? [])];
  const empty = !!brief && !headlines.length && !movers.length && !brief.indices.length;

  const moverChip = (q: ScreenerQuote) => {
    const up = (q.regularMarketChangePercent ?? 0) >= 0;
    const chip =
      "inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[11px] font-bold tabular-nums hover:border-primary transition-colors";
    const body = (
      <>
        {q.symbol}
        <span className={up ? "text-up" : "text-down"}>{pctText(q.regularMarketChangePercent)}</span>
      </>
    );
    const title = `${q.shortName ?? q.longName ?? q.symbol}${onSymbol ? " (tap to open)" : ""}`;
    return onSymbol ? (
      <button key={q.symbol} type="button" onClick={() => onSymbol(q.symbol)} className={chip} title={title}>
        {body}
      </button>
    ) : (
      <Link key={q.symbol} to={`/stocks/${q.symbol.toLowerCase()}`} className={chip} title={title}>
        {body}
      </Link>
    );
  };

  return (
    <section aria-label="Today's market brief" className={cn("bg-accent/40 p-3.5 space-y-3", className)}>
      <div className="flex items-center gap-1.5">
        <Newspaper className="w-4 h-4 text-primary shrink-0" />
        <span className="text-xs font-extrabold uppercase tracking-wider text-primary">Market brief</span>
        <span className="ml-auto text-[11px] text-muted-foreground">{date}</span>
      </div>

      {!brief ? (
        <div className="space-y-2 animate-pulse" aria-label="Loading today's brief">
          <div className="h-3 rounded bg-muted w-3/4" />
          <div className="h-3 rounded bg-muted w-full" />
          <div className="h-3 rounded bg-muted w-5/6" />
        </div>
      ) : empty ? (
        <p className="text-xs text-muted-foreground">Today's brief isn't available right now.</p>
      ) : (
        <>
          {brief.indices.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {BRIEF_INDICES.map(({ symbol, label }) => {
                const q = brief.indices.find((x) => x.symbol === symbol);
                if (!q) return null;
                const pct = q.regularMarketChangePercent;
                return (
                  <span
                    key={symbol}
                    className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[11px] font-semibold tabular-nums"
                  >
                    <span className="text-muted-foreground">{label}</span>
                    <span className={(pct ?? 0) >= 0 ? "text-up" : "text-down"}>{pctText(pct)}</span>
                  </span>
                );
              })}
            </div>
          )}

          {movers.length > 0 && <p className="text-xs text-muted-foreground">{MOOD[brief.mood]}</p>}

          {headlines.length > 0 && (
            <ul className="space-y-2">
              {headlines.map((n) => (
                <li key={n.uuid || n.link}>
                  <a
                    href={n.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block"
                  >
                    <span className="block text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {n.title}
                    </span>
                    <span className="block text-[11px] text-muted-foreground mt-0.5">
                      {n.publisher} · {timeAgo(n.providerPublishTime)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          {movers.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Top movers</div>
              <div className="flex flex-wrap gap-1.5">{movers.map(moverChip)}</div>
            </div>
          )}
        </>
      )}

      <Link
        to="/market-brief"
        className="inline-flex items-center gap-1 text-xs font-extrabold text-primary hover:underline"
      >
        Read today's full brief <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </section>
  );
};
