import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/backend";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { formatNumber } from "@/lib/yahoo";
import { estimatedNetWorth, hasTraded } from "@/lib/simLedger";
import { useCashSynced } from "@/lib/simAdmin";
import { Trophy, Loader2, Briefcase, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PortfolioBar } from "./PortfolioBar";
import { HoldingsPanel, type Holding } from "./HoldingsPanel";

interface Row {
  member_id: string;
  /** This row is the signed-in player. */
  me: boolean;
  cash: number;
  /** cash comes from the trade history, so it's exact. */
  ledgerCash: boolean;
  /** Whether they've made a stock trade, when the trade history was checked. */
  traded?: boolean;
  positions: { symbol: string; shares: number; avgCost: number }[];
  display_name: string;
}

// Other players' rows are re-read this often so their trades show up.
const REFRESH_MS = 30_000;

type LeaderboardFn = (
  name: "sim_leaderboard",
  args: { _game_id: string },
) => Promise<{
  data:
    | {
        member_id: string;
        is_me: boolean;
        display_name: string;
        cash: number | string;
        traded: boolean;
        positions: { symbol: string; shares: number | string; avg_cost: number | string }[];
      }[]
    | null;
  error: { code?: string; message: string } | null;
}>;

/**
 * Every player in the game. Players can only read their own portfolio rows,
 * so this goes through the sim_leaderboard database function
 * (supabase/migrations/20261020180000_sim_leaderboard.sql, pasted into
 * Lovable's SQL editor). Until that's installed it reads the tables directly,
 * which only admins can do for other players. Null if the read failed.
 */
async function loadRows(gameId: string, meUserId: string): Promise<Row[] | null> {
  const rpc = (supabase as unknown as { rpc: LeaderboardFn }).rpc.bind(supabase);
  const { data, error } = await rpc("sim_leaderboard", { _game_id: gameId });
  if (!error) {
    return (data ?? []).map((r) => ({
      member_id: r.member_id,
      me: r.is_me,
      cash: Number(r.cash),
      ledgerCash: true,
      traded: r.traded,
      positions: (r.positions ?? []).map((p) => ({ symbol: p.symbol, shares: Number(p.shares), avgCost: Number(p.avg_cost) })),
      display_name: r.display_name,
    }));
  }
  const missing = error.code === "PGRST202" || /could not find the function/i.test(error.message);
  if (!missing) {
    console.error("sim_leaderboard failed", error);
    return null;
  }

  const { data: members, error: mErr } = await supabase
    .from("game_members")
    .select("id, user_id, cash")
    .eq("game_id", gameId);
  if (mErr) return null;
  const memberIds = (members ?? []).map((m) => m.id);
  const [{ data: positions }, { data: profs }] = await Promise.all([
    memberIds.length
      ? supabase.from("positions").select("member_id, symbol, shares, avg_cost").in("member_id", memberIds)
      : Promise.resolve({ data: [] as { member_id: string; symbol: string; shares: number; avg_cost: number }[] }),
    supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", (members ?? []).map((m) => m.user_id)),
  ]);
  const byMember = new Map<string, { symbol: string; shares: number; avgCost: number }[]>();
  (positions ?? []).forEach((p) => {
    const list = byMember.get(p.member_id) ?? [];
    list.push({ symbol: p.symbol, shares: Number(p.shares), avgCost: Number(p.avg_cost) });
    byMember.set(p.member_id, list);
  });
  const nameByUser = new Map((profs ?? []).map((p) => [p.user_id, p.display_name ?? "Player"]));
  return (members ?? []).map((m) => ({
    member_id: m.id,
    me: m.user_id === meUserId,
    cash: Number(m.cash),
    ledgerCash: false,
    positions: byMember.get(m.id) ?? [],
    display_name: nameByUser.get(m.user_id) ?? "Player",
  }));
}

export const Leaderboard = ({
  gameId,
  meUserId,
  startingCash,
  myCash,
  myHoldings,
  myTraded,
  othersHoldings = "shown",
  onSelectStock,
}: {
  gameId: string;
  meUserId: string;
  startingCash: number;
  /** Your cash as computed from your own trade history; overrides your stored balance. */
  myCash?: number;
  /**
   * Your stocks at the prices the rest of the page shows; overrides the
   * positions loaded here, which fall behind as soon as you trade.
   */
  myHoldings?: { symbol: string; shares: number; avgCost: number; last: number }[];
  /** Whether your own trade history has any stock trades in it. */
  myTraded?: boolean;
  /**
   * Whether tapping another player shows their stocks: "shown" when the game
   * allows it, "hidden" when it doesn't, "creator" when it doesn't but you made
   * the game (or are an admin), so you still can.
   */
  othersHoldings?: "shown" | "hidden" | "creator";
  /** Opens a stock from someone's portfolio in the trade view. */
  onSelectStock?: (symbol: string) => void;
}) => {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      // A failed refresh keeps the rows already shown.
      const next = await loadRows(gameId, meUserId);
      if (alive && next) setRows(next);
    };
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [gameId, meUserId]);

  const symbols = useMemo(() => {
    const s = new Set<string>();
    (rows ?? []).forEach((r) => r.positions.forEach((p) => s.add(p.symbol)));
    return [...s];
  }, [rows]);
  const { quotes } = useLiveQuotes(symbols, 10000);
  const synced = useCashSynced();
  // A symbol whose quote failed has no price; it falls back to average cost
  // below instead of counting as $0.
  const priceMap = useMemo(
    () =>
      new Map(
        quotes
          .filter((q) => Number.isFinite(q.regularMarketPrice) && q.regularMarketPrice! > 0)
          .map((q) => [q.symbol, q.regularMarketPrice!]),
      ),
    [quotes],
  );

  const ranked = useMemo(() => {
    if (!rows) return [];
    return rows
      .map((r) => {
        const priced =
          r.me && myHoldings
            ? myHoldings
            : r.positions.map((p) => ({ ...p, last: priceMap.get(p.symbol) ?? p.avgCost }));
        const holdings = priced.reduce((sum, p) => sum + p.last * p.shares, 0);
        // Your own row uses your trade history and live holdings, so it matches
        // the net worth at the top of the page. Other players' cash comes from
        // their trade history when the database function supplies it, and is
        // estimated from their stored cash otherwise.
        const ownCash = r.me && myCash != null ? myCash : null;
        const equity =
          ownCash != null ? ownCash + holdings : estimatedNetWorth(startingCash, r.cash, priced, synced || r.ledgerCash);
        // Players who haven't traded yet get no rank (N/A) and sit below everyone ranked.
        const traded =
          (r.me && !!myTraded) || (r.traded ?? hasTraded(startingCash, ownCash ?? r.cash, priced.length));
        return {
          ...r,
          priced,
          equity,
          traded,
          returnPct: startingCash > 0 ? ((equity - startingCash) / startingCash) * 100 : 0,
        };
      })
      .sort((a, b) =>
        a.traded !== b.traded
          ? Number(b.traded) - Number(a.traded)
          : a.traded
            ? b.equity - a.equity
            : a.display_name.localeCompare(b.display_name),
      );
  }, [rows, priceMap, startingCash, myCash, myHoldings, myTraded, synced]);

  // Ranked players come first, so a ranked player's index is their rank.
  const rankedCount = ranked.filter((r) => r.traded).length;
  const mine = ranked.find((r) => r.me);
  const myRank = ranked.findIndex((r) => r.me);
  const [viewing, setViewing] = useState<(typeof ranked)[number] | null>(null);
  // Keep the open dialog's prices live instead of freezing them at click time.
  const liveViewing = viewing ? ranked.find((r) => r.member_id === viewing.member_id) ?? viewing : null;
  // Their portfolio in the same shape as yours, so it shows the same bar and table.
  const viewingHoldings: Holding[] = (liveViewing?.priced ?? []).map((p) => ({ ...p, id: p.symbol, prevClose: p.last }));
  const viewingInvested = viewingHoldings.reduce((s, h) => s + h.last * h.shares, 0);

  return (
    <div className="rounded-3xl border-2 bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-extrabold text-lg inline-flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" /> Leaderboard
        </h3>
        {mine && (
          <span
            className="text-xs font-extrabold text-primary bg-accent px-2.5 py-1 rounded-full"
            title={mine.traded ? undefined : "Make a trade to get ranked"}
          >
            Your rank: {mine.traded ? `#${myRank + 1} of ${rankedCount}` : "N/A"}
          </span>
        )}
      </div>
      {ranked.length > 1 && (
        <p className="-mt-1 mb-3 text-xs text-muted-foreground flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 shrink-0 text-primary" />
          {othersHoldings === "shown"
            ? "Tap a player to see their portfolio."
            : othersHoldings === "creator"
              ? "Players can't see each other's portfolios in this game. You made it, so tap a player to see theirs."
              : "This game keeps each player's portfolio private."}
        </p>
      )}
      {!rows ? (
        <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : ranked.length === 0 ? (
        <p className="text-sm text-muted-foreground">No players yet.</p>
      ) : (
        <ol className="space-y-1.5">
          {ranked.map((r, i) => {
            const me = r.me;
            const canView = me || othersHoldings !== "hidden";
            const rowClass = cn(
              "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm text-left",
              me ? "bg-primary/10 border border-primary/40 font-extrabold" : "bg-muted/40",
            );
            const content = (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      "w-8 shrink-0 text-center tabular-nums font-extrabold text-muted-foreground",
                      !r.traded && "text-[11px]",
                    )}
                    title={r.traded ? undefined : "No trades yet, so no rank"}
                  >
                    {r.traded ? i + 1 : "N/A"}
                  </span>
                  <span
                    className={cn(
                      "truncate",
                      canView &&
                        "underline decoration-2 underline-offset-4 decoration-primary/60 group-hover:text-primary group-hover:decoration-primary",
                    )}
                  >
                    {r.display_name}
                  </span>
                  {me && <span className="shrink-0 text-xs text-primary">(you)</span>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="text-right tabular-nums">
                    <div className={cn("font-extrabold", !r.traded && "text-muted-foreground")}>
                      ${formatNumber(r.equity)}
                    </div>
                    {r.traded ? (
                      <div className={cn("text-[11px] font-bold", r.returnPct >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {r.returnPct >= 0 ? "+" : ""}
                        {formatNumber(r.returnPct)}%
                      </div>
                    ) : (
                      <div className="text-[11px] font-bold text-muted-foreground">No trades yet</div>
                    )}
                  </div>
                  {canView && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  )}
                </div>
              </>
            );
            return (
              <li key={r.member_id}>
                {canView ? (
                  // The whole row opens their portfolio, not just the name.
                  <button
                    type="button"
                    onClick={() => setViewing(r)}
                    className={cn(
                      rowClass,
                      "group transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    )}
                    title={me ? "See your portfolio" : `See ${r.display_name}'s portfolio`}
                  >
                    {content}
                  </button>
                ) : (
                  <div className={rowClass}>{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {rankedCount < ranked.length && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Players show N/A until they make their first trade.
        </p>
      )}

      <Dialog open={!!liveViewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto grid-cols-1 p-4 sm:p-6"
          aria-describedby={undefined}
          // Focus the dialog, not the bar's first slice, which would open with
          // that slice picked and the rest dimmed.
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement).focus();
          }}
        >
          {liveViewing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" />
                  {liveViewing.me ? "Your portfolio" : `${liveViewing.display_name}'s portfolio`}
                </DialogTitle>
              </DialogHeader>
              <PortfolioBar
                owner={liveViewing.me ? undefined : liveViewing.display_name}
                equity={liveViewing.equity}
                // Whatever of their net worth isn't in stocks; negative while borrowing.
                cash={liveViewing.equity - viewingInvested}
                totalReturnPct={liveViewing.returnPct}
                holdings={viewingHoldings}
                className="rounded-2xl px-4 py-5 sm:px-6 sm:py-6 shadow-none"
              />
              <HoldingsPanel
                holdings={viewingHoldings}
                title={liveViewing.me ? "Your holdings" : `${liveViewing.display_name}'s holdings`}
                empty={liveViewing.me ? "You don't own any stocks yet." : `${liveViewing.display_name} doesn't own any stocks yet.`}
                showDayPl={false}
                onSelect={(symbol) => {
                  if (!onSelectStock) return;
                  setViewing(null);
                  onSelectStock(symbol);
                }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
