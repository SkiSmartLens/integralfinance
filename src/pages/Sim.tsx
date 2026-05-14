import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { DragSheet } from "@/components/DragSheet";
import { useFlash } from "@/hooks/useFlash";
import { fetchQuotes, formatNumber, formatLargeNumber } from "@/lib/yahoo";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { LogOut, Plus, Users, Search, Globe, Lock, Wrench } from "lucide-react";

interface Game { id: string; name: string; starting_cash: number; commission: number; join_code: string; created_by: string; is_public?: boolean; }
interface Member { id: string; game_id: string; user_id: string; cash: number; }
interface Position { id: string; symbol: string; shares: number; avg_cost: number; }
interface Tx { id: string; symbol: string; side: string; shares: number; price: number; created_at: string; }
interface Order { id: string; symbol: string; side: string; order_type: string; shares: number; limit_price: number | null; stop_price: number | null; status: string; created_at: string; }

const Sim = () => {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [pending, setPending] = useState<Order[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [prevCloses, setPrevCloses] = useState<Record<string, number>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showBrowse, setShowBrowse] = useState(false);
  const [showDev, setShowDev] = useState(false);
  const [sheetSignal, setSheetSignal] = useState(0);

  // Order ticket
  const [symbol, setSymbol] = useState("AAPL");
  const [shares, setShares] = useState(10);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit" | "stop">("market");
  const [limitPrice, setLimitPrice] = useState<number | "">("");
  const [stopPrice, setStopPrice] = useState<number | "">("");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) nav("/auth");
      else setUserId(session.user.id);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) nav("/auth");
      else setUserId(data.session.user.id);
    });
    return () => subscription.unsubscribe();
  }, [nav]);

  const reloadGames = async () => {
    if (!userId) return;
    const { data: ms } = await supabase.from("game_members").select("*").eq("user_id", userId);
    setMembers((ms ?? []) as Member[]);
    const ids = (ms ?? []).map((m) => m.game_id);
    if (ids.length) {
      const { data: gs } = await supabase.from("games").select("*").in("id", ids);
      setGames((gs ?? []) as Game[]);
      if (!activeGameId && gs && gs.length) setActiveGameId(gs[0].id);
    } else {
      setGames([]);
    }
  };

  useEffect(() => { reloadGames(); /* eslint-disable-next-line */ }, [userId]);

  const activeMember = members.find((m) => m.game_id === activeGameId);

  const reloadPortfolio = async () => {
    if (!activeMember) return;
    const [{ data: pos }, { data: tx }, { data: ords }] = await Promise.all([
      supabase.from("positions").select("*").eq("member_id", activeMember.id),
      supabase.from("transactions").select("*").eq("member_id", activeMember.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("orders").select("*").eq("member_id", activeMember.id).eq("status", "pending").order("created_at", { ascending: false }),
    ]);
    setPositions((pos ?? []) as Position[]);
    setTxs((tx ?? []) as Tx[]);
    setPending((ords ?? []) as Order[]);
  };

  useEffect(() => { reloadPortfolio(); /* eslint-disable-next-line */ }, [activeMember?.id]);

  // Live prices for positions
  useEffect(() => {
    const syms = positions.map((p) => p.symbol);
    if (!syms.length) return;
    let alive = true;
    const load = async () => {
      const qs = await fetchQuotes(syms);
      if (!alive) return;
      const m: Record<string, number> = {};
      const pc: Record<string, number> = {};
      qs.forEach((q) => {
        if (q.regularMarketPrice) m[q.symbol] = q.regularMarketPrice;
        if (q.regularMarketPreviousClose) pc[q.symbol] = q.regularMarketPreviousClose;
      });
      setPrices(m);
      setPrevCloses(pc);
    };
    load();
    const t = setInterval(load, 15000);
    return () => { alive = false; clearInterval(t); };
  }, [positions.map((p) => p.symbol).join(",")]);

  const portfolioValue = positions.reduce((sum, p) => sum + (prices[p.symbol] ?? p.avg_cost) * Number(p.shares), 0);
  const dayPL = positions.reduce((sum, p) => {
    const last = prices[p.symbol] ?? Number(p.avg_cost);
    const prev = prevCloses[p.symbol] ?? last;
    return sum + (last - prev) * Number(p.shares);
  }, 0);
  const equity = (Number(activeMember?.cash ?? 0)) + portfolioValue;
  const startCash = games.find((g) => g.id === activeGameId)?.starting_cash ?? 100000;
  const totalReturnPct = ((equity - Number(startCash)) / Number(startCash)) * 100;

  const createGame = async (name: string, cash: number, commission: number, allowShort: boolean, isPublic: boolean) => {
    if (!userId) return toast({ title: "Not signed in", variant: "destructive" });
    if (!name.trim()) return toast({ title: "Name required", variant: "destructive" });
    if (!Number.isFinite(cash) || cash <= 0) return toast({ title: "Starting cash must be positive", variant: "destructive" });
    try {
      const { data, error } = await supabase.from("games")
        .insert({ name: name.trim(), starting_cash: cash, commission, allow_short: allowShort, is_public: isPublic, created_by: userId })
        .select().single();
      if (error || !data) {
        console.error("create game error", error);
        return toast({ title: "Failed to create game", description: error?.message ?? "Unknown error", variant: "destructive" });
      }
      const { error: jErr } = await supabase.from("game_members")
        .upsert({ game_id: data.id, user_id: userId, cash }, { onConflict: "game_id,user_id", ignoreDuplicates: true });
      if (jErr && !/duplicate/i.test(jErr.message)) {
        console.error("join own game error", jErr);
        return toast({ title: "Game created but join failed", description: jErr.message, variant: "destructive" });
      }
      try {
        localStorage.setItem("lastJoinCode", data.join_code);
        await navigator.clipboard?.writeText(data.join_code);
      } catch {}
      toast({ title: "Game created", description: `Code ${data.join_code} copied to clipboard` });
      setShowCreate(false);
      setActiveGameId(data.id);
      await reloadGames();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed to create game", description: e?.message ?? "Unexpected error", variant: "destructive" });
    }
  };

  const joinGame = async (code: string) => {
    if (!userId) return;
    const { data: g, error } = await supabase.from("games").select("*").eq("join_code", code.toUpperCase()).maybeSingle();
    if (error || !g) return toast({ title: "Game not found", description: error?.message, variant: "destructive" });
    return joinGameById(g.id, Number(g.starting_cash), g.join_code);
  };

  const joinGameById = async (gameId: string, startingCash: number, joinCode?: string) => {
    if (!userId) return;
    const { error: jErr } = await supabase.from("game_members")
      .upsert({ game_id: gameId, user_id: userId, cash: startingCash }, { onConflict: "game_id,user_id", ignoreDuplicates: true });
    if (jErr && !/duplicate/i.test(jErr.message)) {
      console.error("join error", jErr);
      return toast({ title: "Couldn't join", description: jErr.message, variant: "destructive" });
    }
    if (joinCode) { try { localStorage.setItem("lastJoinCode", joinCode); } catch {} }
    setShowJoin(false);
    setActiveGameId(gameId);
    await reloadGames();
    toast({ title: "Joined game" });
  };

  const togglePublic = async (g: Game) => {
    if (g.created_by !== userId) return;
    const { error } = await supabase.from("games").update({ is_public: !g.is_public }).eq("id", g.id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    toast({ title: g.is_public ? "Set to private" : "Set to public" });
    await reloadGames();
  };

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMember) return toast({ title: "Join or create a game first", variant: "destructive" });
    setPlacing(true);
    const { data, error } = await supabase.functions.invoke("place-order", {
      body: {
        member_id: activeMember.id,
        symbol: symbol.toUpperCase(),
        side, shares: Number(shares),
        order_type: orderType,
        limit_price: orderType === "limit" ? Number(limitPrice) : null,
        stop_price: orderType === "stop" ? Number(stopPrice) : null,
      },
    });
    setPlacing(false);
    if (error) return toast({ title: "Order failed", description: error.message, variant: "destructive" });
    if ((data as any)?.error) return toast({ title: "Order failed", description: (data as any).error, variant: "destructive" });
    toast({
      title: (data as any)?.queued ? "Order queued (after-hours)" : `Filled @ ${formatNumber((data as any)?.price)}`,
      description: `${side.toUpperCase()} ${shares} ${symbol.toUpperCase()}`,
    });
    reloadPortfolio();
    reloadGames();
  };

  const cancelOrder = async (id: string) => {
    const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast({ title: "Cancel failed", description: error.message, variant: "destructive" });
    toast({ title: "Order cancelled" });
    reloadPortfolio();
  };

  const signOut = async () => { await supabase.auth.signOut(); nav("/auth"); };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Trading Simulator — Integral Stocks"
        description="Multiplayer paper-trading simulator with live prices, leaderboards, limit/stop orders, and shareable game codes."
        path="/sim"
      />
      <h1 className="sr-only">Trading Simulator</h1>
      <Header onSearch={(s) => setSymbol(s)} />
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => nav("/")} className="text-sm text-muted-foreground hover:text-foreground">← Markets</button>
            <span className="text-muted-foreground">/</span>
            <span className="font-bold">Simulator</span>
            {games.length > 0 && (
              <select value={activeGameId ?? ""} onChange={(e) => setActiveGameId(e.target.value)}
                className="bg-muted px-2 py-1 rounded text-sm ml-2">
                {games.map((g) => <option key={g.id} value={g.id}>{g.name} · {g.join_code}</option>)}
              </select>
            )}
            {activeGameId && (() => {
              const g = games.find((x) => x.id === activeGameId);
              if (!g || g.created_by !== userId) return null;
              return (
                <>
                  <button onClick={() => togglePublic(g)}
                    className="ml-1 px-2 py-1 text-[11px] rounded bg-muted flex items-center gap-1"
                    title={g.is_public ? "Public — anyone can browse and join" : "Private — code required"}>
                    {g.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {g.is_public ? "Public" : "Private"}
                  </button>
                  <button onClick={() => setShowDev(true)}
                    className="px-2 py-1 text-[11px] rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold"
                    title="Creator dev tools">
                    <Wrench className="w-3 h-3" /> Dev
                  </button>
                </>
              );
            })()}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowBrowse(true)} className="px-3 py-1.5 text-xs rounded bg-muted flex items-center gap-1">
              <Search className="w-3.5 h-3.5" /> Browse
            </button>
            <button onClick={() => setShowJoin(true)} className="px-3 py-1.5 text-xs rounded bg-muted flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Join
            </button>
            <button onClick={() => setShowCreate(true)} className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> New game
            </button>
            <button onClick={signOut} className="px-2 py-1.5 text-xs rounded text-muted-foreground hover:text-foreground" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 space-y-6 pb-[80px]">
        {!activeMember ? (
          <div className="bg-card border rounded-lg p-8 text-center">
            <h2 className="text-xl font-bold mb-2">Welcome to the Simulator</h2>
            <p className="text-muted-foreground mb-4">Create a new game or join one with a code to start trading.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded bg-primary text-primary-foreground">Create game</button>
              <button onClick={() => setShowJoin(true)} className="px-4 py-2 rounded bg-muted">Join game</button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Stat label="Cash" value={`$${formatNumber(Number(activeMember.cash))}`} />
              <Stat label="Holdings" value={`$${formatNumber(portfolioValue)}`} />
              <Stat label="Equity" value={`$${formatNumber(equity)}`} />
              <Stat label="Day P&L" value={`${dayPL >= 0 ? "+" : ""}$${formatNumber(dayPL)}`}
                cls={dayPL >= 0 ? "text-up" : "text-down"} />
              <Stat label="Total Return" value={`${totalReturnPct >= 0 ? "+" : ""}${formatNumber(totalReturnPct)}%`}
                cls={totalReturnPct >= 0 ? "text-up" : "text-down"} />
            </div>

            <div className="grid lg:grid-cols-[1fr_360px] gap-6">
              <section className="bg-card border rounded-lg p-4">
                <h3 className="font-bold mb-3">Positions</h3>
                {positions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No positions yet. Place an order to begin.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted-foreground border-b">
                        <tr><th className="text-left py-2">Symbol</th><th className="text-right">Shares</th>
                          <th className="text-right">Avg Cost</th><th className="text-right">Last</th>
                          <th className="text-right">Value</th><th className="text-right">P&amp;L</th></tr>
                      </thead>
                      <tbody>
                        {positions.map((p) => (
                          <PositionRow
                            key={p.id}
                            p={p}
                            last={prices[p.symbol] ?? Number(p.avg_cost)}
                            onClick={() => {
                              setSymbol(p.symbol);
                              setSheetSignal((s) => s + 1);
                            }}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {positions.length > 0 && (
                  <Allocation
                    cash={Number(activeMember.cash)}
                    rows={positions.map((p) => ({
                      symbol: p.symbol,
                      value: (prices[p.symbol] ?? Number(p.avg_cost)) * Number(p.shares),
                    }))}
                  />
                )}
              </section>

              <aside className="bg-card border rounded-lg p-4">
                <h3 className="font-bold mb-3">Place order</h3>
                <form onSubmit={placeOrder} className="space-y-3">
                  <div className="flex gap-1 bg-muted rounded p-1">
                    {(["buy", "sell"] as const).map((s) => (
                      <button type="button" key={s} onClick={() => setSide(s)}
                        className={cn("flex-1 py-1.5 rounded text-sm font-semibold capitalize",
                          side === s ? (s === "buy" ? "bg-up text-white" : "bg-down text-white") : "text-muted-foreground")}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="Symbol" className="w-full px-3 py-2 bg-muted rounded outline-none" />
                  <input type="number" min={1} value={shares} onChange={(e) => setShares(Number(e.target.value))}
                    placeholder="Shares" className="w-full px-3 py-2 bg-muted rounded outline-none" />
                  <select value={orderType} onChange={(e) => setOrderType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-muted rounded outline-none">
                    <option value="market">Market</option>
                    <option value="limit">Limit</option>
                    <option value="stop">Stop</option>
                  </select>
                  {orderType === "limit" && (
                    <input type="number" step="0.01" value={limitPrice} onChange={(e) => setLimitPrice(Number(e.target.value))}
                      placeholder="Limit price" className="w-full px-3 py-2 bg-muted rounded outline-none" />
                  )}
                  {orderType === "stop" && (
                    <input type="number" step="0.01" value={stopPrice} onChange={(e) => setStopPrice(Number(e.target.value))}
                      placeholder="Stop price" className="w-full px-3 py-2 bg-muted rounded outline-none" />
                  )}
                  <button disabled={placing} className="w-full py-2 rounded bg-primary text-primary-foreground font-semibold disabled:opacity-60">
                    {placing ? "Placing…" : `${side === "buy" ? "Buy" : "Sell"} ${shares || ""} ${symbol}`}
                  </button>
                  <p className="text-[10px] text-muted-foreground">
                    After-hours orders are queued and filled at the next live print.
                  </p>
                </form>
              </aside>
            </div>

            <Leaderboard gameId={activeGameId!} />

            <section className="bg-card border rounded-lg p-4">
              <h3 className="font-bold mb-3">Pending orders</h3>
              {pending.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No queued or working orders.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="text-left py-2">Placed</th>
                      <th className="text-left">Symbol</th>
                      <th>Side</th>
                      <th>Type</th>
                      <th className="text-right">Shares</th>
                      <th className="text-right">Trigger</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((o) => (
                      <tr key={o.id} className="border-b last:border-0">
                        <td className="py-2 text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
                        <td className="font-semibold">{o.symbol}</td>
                        <td className={cn("uppercase text-xs font-semibold", o.side === "buy" ? "text-up" : "text-down")}>{o.side}</td>
                        <td className="uppercase text-xs">{o.order_type}</td>
                        <td className="text-right tabular-nums">{o.shares}</td>
                        <td className="text-right tabular-nums">{o.limit_price ?? o.stop_price ?? "—"}</td>
                        <td className="text-right">
                          <button onClick={() => cancelOrder(o.id)} className="text-xs px-2 py-1 rounded bg-muted hover:bg-down hover:text-white">Cancel</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="bg-card border rounded-lg p-4">
              <h3 className="font-bold mb-3">Recent transactions</h3>
              {txs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No trades yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr><th className="text-left py-2">Time</th><th className="text-left">Symbol</th><th>Side</th><th className="text-right">Shares</th><th className="text-right">Price</th></tr>
                  </thead>
                  <tbody>
                    {txs.map((t) => (
                      <tr key={t.id} className="border-b last:border-0">
                        <td className="py-2 text-muted-foreground">{new Date(t.created_at).toLocaleString()}</td>
                        <td className="font-semibold">{t.symbol}</td>
                        <td className={cn("uppercase text-xs font-semibold", t.side === "buy" ? "text-up" : "text-down")}>{t.side}</td>
                        <td className="text-right tabular-nums">{t.shares}</td>
                        <td className="text-right tabular-nums">{formatNumber(t.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </main>

      {showCreate && <CreateGameModal onClose={() => setShowCreate(false)} onCreate={createGame} />}
      {showJoin && <JoinGameModal onClose={() => setShowJoin(false)} onJoin={joinGame} />}
      {showBrowse && (
        <BrowseGamesModal
          onClose={() => setShowBrowse(false)}
          onJoin={(g) => joinGameById(g.id, Number(g.starting_cash), g.join_code)}
        />
      {showDev && activeMember && (
        <DevModal
          onClose={() => setShowDev(false)}
          memberId={activeMember.id}
          gameId={activeGameId!}
          currentCash={Number(activeMember.cash)}
          onChanged={() => { reloadGames(); reloadPortfolio(); }}
        />
      )}

      <DragSheet title="Integral Stocks" openSignal={sheetSignal}>
        <div className="p-4 space-y-3">
          {activeMember ? (
            <>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">Cash</div>
                  <div className="font-bold tabular-nums">${formatNumber(Number(activeMember.cash))}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">Equity</div>
                  <div className="font-bold tabular-nums">${formatNumber(equity)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">Total</div>
                  <div className={cn("font-bold tabular-nums", totalReturnPct >= 0 ? "text-up" : "text-down")}>
                    {totalReturnPct >= 0 ? "+" : ""}{formatNumber(totalReturnPct)}%
                  </div>
                </div>
              </div>
              <form onSubmit={placeOrder} className="grid grid-cols-2 gap-2">
                <div className="col-span-2 flex gap-1 bg-muted rounded p-1">
                  {(["buy", "sell"] as const).map((s) => (
                    <button type="button" key={s} onClick={() => setSide(s)}
                      className={cn("flex-1 py-1.5 rounded text-sm font-semibold capitalize",
                        side === s ? (s === "buy" ? "bg-up text-white" : "bg-down text-white") : "text-muted-foreground")}>
                      {s}
                    </button>
                  ))}
                </div>
                <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="Symbol" className="px-3 py-2 bg-muted rounded outline-none text-sm" />
                <input type="number" min={1} value={shares} onChange={(e) => setShares(Number(e.target.value))}
                  placeholder="Shares" className="px-3 py-2 bg-muted rounded outline-none text-sm" />
                <button disabled={placing} className="col-span-2 py-2 rounded bg-primary text-primary-foreground font-semibold disabled:opacity-60 text-sm">
                  {placing ? "Placing…" : `${side === "buy" ? "Buy" : "Sell"} ${shares || ""} ${symbol}`}
                </button>
              </form>
            </>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4">
              Join or create a game to use the quick ticket.
            </p>
          )}
        </div>
      </DragSheet>
    </div>
  );
};

const Stat = ({ label, value, cls }: { label: string; value: string; cls?: string }) => (
  <div className="bg-card border rounded-lg p-3">
    <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
    <div className={cn("text-xl font-bold tabular-nums", cls)}>{value}</div>
  </div>
);

const Leaderboard = ({ gameId }: { gameId: string }) => {
  const [rows, setRows] = useState<{ name: string; equity: number }[]>([]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data: ms } = await supabase.from("game_members").select("id, user_id, cash").eq("game_id", gameId);
      if (!ms || !alive) return;
      const userIds = ms.map((m) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
      const result: { name: string; equity: number }[] = [];
      for (const m of ms) {
        const { data: pos } = await supabase.from("positions").select("symbol, shares, avg_cost").eq("member_id", m.id);
        let value = Number(m.cash);
        if (pos && pos.length) {
          const qs = await fetchQuotes(pos.map((p) => p.symbol));
          const map: Record<string, number> = {};
          qs.forEach((q) => { if (q.regularMarketPrice) map[q.symbol] = q.regularMarketPrice; });
          for (const p of pos) value += (map[p.symbol] ?? Number(p.avg_cost)) * Number(p.shares);
        }
        const name = profiles?.find((p) => p.user_id === m.user_id)?.display_name ?? "trader";
        result.push({ name, equity: value });
      }
      result.sort((a, b) => b.equity - a.equity);
      if (alive) setRows(result);
    };
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, [gameId]);
  return (
    <section className="bg-card border rounded-lg p-4">
      <h3 className="font-bold mb-3">Leaderboard</h3>
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground border-b">
          <tr><th className="text-left py-2 w-12">#</th><th className="text-left">Trader</th><th className="text-right">Equity</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="py-2 font-semibold">{i + 1}</td>
              <td>{r.name}</td>
              <td className="text-right tabular-nums">${formatNumber(r.equity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

const Modal = ({ children, onClose }: any) => (
  <div onClick={onClose} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div onClick={(e) => e.stopPropagation()} className="bg-card border rounded-lg p-6 max-w-sm w-full">
      {children}
    </div>
  </div>
);

const ALLOC_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-up))",
  "hsl(var(--chart-down))",
  "hsl(45 95% 55%)",
  "hsl(280 70% 60%)",
  "hsl(190 80% 50%)",
  "hsl(20 90% 60%)",
  "hsl(150 60% 45%)",
  "hsl(330 70% 60%)",
  "hsl(220 60% 60%)",
];

const Allocation = ({ cash, rows }: { cash: number; rows: { symbol: string; value: number }[] }) => {
  const total = cash + rows.reduce((s, r) => s + r.value, 0);
  if (total <= 0) return null;
  const slices = [
    ...rows.map((r, i) => ({ label: r.symbol, value: r.value, color: ALLOC_COLORS[i % ALLOC_COLORS.length] })),
    { label: "Cash", value: cash, color: "hsl(var(--muted-foreground) / 0.5)" },
  ].filter((s) => s.value > 0);
  // Conic gradient slices.
  let acc = 0;
  const stops = slices
    .map((s) => {
      const start = (acc / total) * 100;
      acc += s.value;
      const end = (acc / total) * 100;
      return `${s.color} ${start}% ${end}%`;
    })
    .join(", ");
  return (
    <div className="mt-4 pt-4 border-t flex items-center gap-5 flex-wrap">
      <div
        className="w-28 h-28 rounded-full shrink-0 relative"
        style={{ background: `conic-gradient(${stops})` }}
        aria-label="Allocation pie chart"
      >
        <div className="absolute inset-3 rounded-full bg-card flex flex-col items-center justify-center">
          <div className="text-[10px] text-muted-foreground uppercase">Equity</div>
          <div className="text-xs font-bold tabular-nums">${formatLargeNumber(total)}</div>
        </div>
      </div>
      <ul className="flex-1 min-w-0 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {slices.map((s) => {
          const pct = (s.value / total) * 100;
          return (
            <li key={s.label} className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
              <span className="font-semibold truncate">{s.label}</span>
              <span className="ml-auto tabular-nums text-muted-foreground">{pct.toFixed(1)}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const CreateGameModal = ({ onClose, onCreate }: { onClose: () => void; onCreate: (n: string, c: number, commission: number, allowShort: boolean, isPublic: boolean) => void }) => {
  const [name, setName] = useState("My Game");
  const [cash, setCash] = useState(100000);
  const [commission, setCommission] = useState(0);
  const [allowShort, setAllowShort] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  return (
    <Modal onClose={onClose}>
      <h3 className="font-bold text-lg mb-3">New game</h3>
      <div className="space-y-3">
        <label className="block text-xs text-muted-foreground">Game name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full px-3 py-2 bg-muted rounded outline-none" />
        <label className="block text-xs text-muted-foreground">Starting cash ($)</label>
        <input type="number" min={1000} step={1000} value={cash} onChange={(e) => setCash(Number(e.target.value))} className="w-full px-3 py-2 bg-muted rounded outline-none" />
        <label className="block text-xs text-muted-foreground">Commission per trade ($)</label>
        <input type="number" min={0} step={0.5} value={commission} onChange={(e) => setCommission(Number(e.target.value))} className="w-full px-3 py-2 bg-muted rounded outline-none" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={allowShort} onChange={(e) => setAllowShort(e.target.checked)} />
          Allow short selling
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          Public — listed in Browse (otherwise code-only)
        </label>
        <button onClick={() => onCreate(name, cash, commission, allowShort, isPublic)} className="w-full py-2 rounded bg-primary text-primary-foreground font-semibold">Create</button>
      </div>
    </Modal>
  );
};

const JoinGameModal = ({ onClose, onJoin }: { onClose: () => void; onJoin: (c: string) => void }) => {
  const [code, setCode] = useState("");
  return (
    <Modal onClose={onClose}>
      <h3 className="font-bold text-lg mb-3">Join game</h3>
      <div className="space-y-3">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Join code" className="w-full px-3 py-2 bg-muted rounded outline-none uppercase" />
        <button onClick={() => onJoin(code)} className="w-full py-2 rounded bg-primary text-primary-foreground font-semibold">Join</button>
      </div>
    </Modal>
  );
};

const BrowseGamesModal = ({ onClose, onJoin }: { onClose: () => void; onJoin: (g: Game) => void }) => {
  const [q, setQ] = useState("");
  const [list, setList] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("games")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(100);
      if (alive) { setList((data ?? []) as Game[]); setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);
  const filtered = list.filter((g) =>
    !q.trim() || g.name.toLowerCase().includes(q.toLowerCase()) || g.join_code.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div onClick={(e) => e.stopPropagation()} className="bg-card border rounded-lg p-6 max-w-lg w-full max-h-[80vh] flex flex-col">
        <h3 className="font-bold text-lg mb-3">Browse public games</h3>
        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or code…"
            className="w-full pl-9 pr-3 py-2 bg-muted rounded outline-none"
          />
        </div>
        <div className="overflow-y-auto -mx-2">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No public games yet. Create one and toggle it public!</p>
          ) : (
            <ul className="divide-y">
              {filtered.map((g) => (
                <li key={g.id} className="px-2 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      {g.name}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      Code {g.join_code} · ${formatNumber(Number(g.starting_cash))} start
                    </div>
                  </div>
                  <button
                    onClick={() => onJoin(g)}
                    className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground font-semibold shrink-0"
                  >
                    Join
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sim;
