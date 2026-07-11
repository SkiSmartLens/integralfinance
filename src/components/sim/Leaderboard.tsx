import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/backend";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { formatNumber } from "@/lib/yahoo";
import { Trophy, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Row {
  member_id: string;
  user_id: string;
  cash: number;
  positions: { symbol: string; shares: number }[];
  display_name: string;
}

export const Leaderboard = ({
  gameId,
  meUserId,
  startingCash,
}: {
  gameId: string;
  meUserId: string;
  startingCash: number;
}) => {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: members } = await supabase
        .from("game_members")
        .select("id, user_id, cash")
        .eq("game_id", gameId);
      const memberIds = (members ?? []).map((m: any) => m.id);
      const [{ data: positions }, { data: profs }] = await Promise.all([
        memberIds.length
          ? supabase.from("positions").select("member_id, symbol, shares").in("member_id", memberIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", (members ?? []).map((m: any) => m.user_id)),
      ]);
      const byMember = new Map<string, { symbol: string; shares: number }[]>();
      (positions ?? []).forEach((p: any) => {
        const list = byMember.get(p.member_id) ?? [];
        list.push({ symbol: p.symbol, shares: Number(p.shares) });
        byMember.set(p.member_id, list);
      });
      const nameByUser = new Map((profs ?? []).map((p: any) => [p.user_id, p.display_name as string]));
      if (!alive) return;
      setRows(
        (members ?? []).map((m: any) => ({
          member_id: m.id,
          user_id: m.user_id,
          cash: Number(m.cash),
          positions: byMember.get(m.id) ?? [],
          display_name: nameByUser.get(m.user_id) ?? "Player",
        })),
      );
    })();
    return () => {
      alive = false;
    };
  }, [gameId]);

  const symbols = useMemo(() => {
    const s = new Set<string>();
    (rows ?? []).forEach((r) => r.positions.forEach((p) => s.add(p.symbol)));
    return [...s];
  }, [rows]);
  const { quotes } = useLiveQuotes(symbols, 10000);
  const priceMap = useMemo(
    () => new Map(quotes.map((q) => [q.symbol, q.regularMarketPrice ?? 0])),
    [quotes],
  );

  const ranked = useMemo(() => {
    if (!rows) return [];
    return rows
      .map((r) => {
        const holdings = r.positions.reduce(
          (sum, p) => sum + (priceMap.get(p.symbol) ?? 0) * p.shares,
          0,
        );
        const equity = r.cash + holdings;
        return { ...r, equity, returnPct: startingCash > 0 ? ((equity - startingCash) / startingCash) * 100 : 0 };
      })
      .sort((a, b) => b.equity - a.equity);
  }, [rows, priceMap, startingCash]);

  const myRank = ranked.findIndex((r) => r.user_id === meUserId);

  return (
    <div className="rounded-3xl border-2 bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-extrabold text-lg inline-flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" /> Leaderboard
        </h3>
        {myRank >= 0 && (
          <span className="text-xs font-extrabold text-primary bg-accent px-2.5 py-1 rounded-full">
            Your rank: #{myRank + 1} of {ranked.length}
          </span>
        )}
      </div>
      {!rows ? (
        <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : ranked.length === 0 ? (
        <p className="text-sm text-muted-foreground">No players yet.</p>
      ) : (
        <ol className="space-y-1.5">
          {ranked.map((r, i) => {
            const me = r.user_id === meUserId;
            return (
              <li
                key={r.member_id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm",
                  me ? "bg-primary/10 border border-primary/40 font-extrabold" : "bg-muted/40",
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-6 text-center tabular-nums font-extrabold text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="truncate">
                    {r.display_name}
                    {me && <span className="ml-1 text-xs text-primary">(you)</span>}
                  </span>
                </div>
                <div className="text-right shrink-0 tabular-nums">
                  <div className="font-extrabold">${formatNumber(r.equity)}</div>
                  <div className={cn("text-[11px] font-bold", r.returnPct >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {r.returnPct >= 0 ? "+" : ""}
                    {formatNumber(r.returnPct)}%
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};
