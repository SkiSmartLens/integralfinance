import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { useFlash } from "@/hooks/useFlash";
import { fetchQuotes, formatNumber, formatLargeNumber } from "@/lib/yahoo";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { LogOut, Plus, Users, Search, Globe, Lock, Wrench, Copy, Menu, X, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

interface Game { id: string; name: string; starting_cash: number; commission: number; join_code: string; created_by: string; is_public?: boolean; allow_short?: boolean; }
interface Member { id: string; game_id: string; user_id: string; cash: number; }
interface Position { id: string; symbol: string; shares: number; avg_cost: number; }
interface Tx { id: string; symbol: string; side: string; shares: number; price: number; created_at: string; }
interface Order { id: string; symbol: string; side: string; order_type: string; shares: number; limit_price: number | null; stop_price: number | null; status: string; created_at: string; }

const ADMIN_EMAILS = ["william.s.wolenski@gmail.com"];
const TX_PAGE_SIZE = 20;

const Sim = () => {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [games, setGames] = useState<Game[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeGameId, setActiveGameId] = useState<string | null>(() => {
    try { return localStorage.getItem("activeSimGame"); } catch { return null; }
  });
  const [positions, setPositions] = useState<Position[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [pending, setPending] = useState<Order[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [prevCloses, setPrevCloses] = useState<Record<string, number>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showBrowse, setShowBrowse] = useState(false);
  const [showDev, setShowDev] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [publicGames, setPublicGames] = useState<Game[]>([]);
  const [publicLoading, setPublicLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [showHelp, setShowHelp] = useState(() => {
    try { return localStorage.getItem("simHelpDismissed") !== "1"; } catch { return true; }
  });
  const [showHelpExpanded, setShowHelpExpanded] = useState(false);
  const dismissHelp = () => {
    setShowHelp(false);
    try { localStorage.setItem("simHelpDismissed", "1"); } catch {}
  };
  const copyCode = async (code: string) => {
    try { await navigator.clipboard.writeText(code); toast({ title: "Join code copied", description: code }); } catch {}
  };

  // Order ticket
  const [symbol, setSymbol] = useState("AAPL");
  const [shares, setShares] = useState(10);
  const [side, setSide] = useState<"buy" | "sell" | "short" | "cover">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit" | "stop">("market");
  const [limitPrice, setLimitPrice] = useState<number | "">("");
  const [stopPrice, setStopPrice] = useState<number | "">("");
  const [placing, setPlacing] = useState(false);
  const [txPage, setTxPage] = useState(0);
  const [leaderboardRefresh, setLeaderboardRefresh] = useState(0);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) {
        setUserId(null);
        setUserEmail("");
        return;
      }
      setUserId(session.user.id);
      setUserEmail(session.user.email ?? "");
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setUserId(null);
        setUserEmail("");
        return;
      }
      setUserId(data.session.user.id);
      setUserEmail(data.session.user.email ?? "");
    });
    return () => subscription.unsubscribe();
  }, [nav]);

  const isAdmin = ADMIN_EMAILS.includes((userEmail || "").toLowerCase());
  const filteredPublicGames = publicGames.filter((g) =>
    !searchQuery.trim() || g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.join_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const jumpToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const reloadGames = async () => {
    if (!userId) return;
    const { data: ms } = await supabase.from("game_members").select("*").eq("user_id", userId);
    setMembers((ms ?? []) as Member[]);
    const ids = (ms ?? []).map((m) => m.game_id);
    if (ids.length) {
      const { data: gs } = await supabase.from("games").select("*").in("id", ids);
      setGames((gs ?? []) as Game[]);
      const saved = localStorage.getItem("activeSimGame");
      const fallback = saved && (gs ?? []).some((g) => g.id === saved) ? saved : (gs ?? [])[0]?.id ?? null;
      if (!activeGameId && fallback) setActiveGameId(fallback);
    } else {
      setGames([]);
    }
  };

  useEffect(() => { reloadGames(); /* eslint-disable-next-line */ }, [userId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setPublicLoading(true);
      const { data } = await supabase.from("games").select("*").eq("is_public", true).order("created_at", { ascending: false }).limit(100);
      if (!alive) return;
      setPublicGames((data ?? []) as Game[]);
      setPublicLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (activeGameId) localStorage.setItem("activeSimGame", activeGameId);
    else localStorage.removeItem("activeSimGame");
  }, [activeGameId]);

  const activeMember = members.find((m) => m.game_id === activeGameId);

  const reloadPortfolio = async () => {
    if (!activeMember) return;
    const [{ data: pos }, { data: tx }, { data: ords }] = await Promise.all([
      supabase.from("positions").select("*").eq("member_id", activeMember.id),
      supabase.from("transactions").select("*").eq("member_id", activeMember.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("orders").select("*").eq("member_id", activeMember.id).eq("status", "pending").order("created_at", { ascending: false }),
    ]);
    setPositions((pos ?? []) as Position[]);
    setTxs((tx ?? []) as Tx[]);
    setPending((ords ?? []) as Order[]);
    setTxPage(0);
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

  // Live price for the symbol in the order ticket — drives the shares slider max.
  // Fetches when a symbol is typed, then refreshes every 15 seconds.
  const [ticketPrice, setTicketPrice] = useState<number | undefined>(undefined);
  useEffect(() => {
    const sym = symbol.trim().toUpperCase();
    if (!sym) { setTicketPrice(undefined); return; }
    let alive = true;
    // Seed instantly from already-loaded position prices if available.
    setTicketPrice(prices[sym] ?? undefined);
    const fetchPrice = () => {
      fetchQuotes([sym]).then((qs) => {
        if (!alive) return;
        const p = qs[0]?.regularMarketPrice;
        if (typeof p === "number") setTicketPrice(p);
      }).catch(() => {});
    };
    const handle = setTimeout(fetchPrice, 250);
    const interval = setInterval(fetchPrice, 15000);
    return () => { alive = false; clearTimeout(handle); clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  const cashAvail = Number(activeMember?.cash ?? 0);
  const currentPositionShares = Number(positions.find((p) => p.symbol === symbol.toUpperCase())?.shares ?? 0);
  const isLong = currentPositionShares > 0;
  const isShort = currentPositionShares < 0;
  const activeGame = games.find((g) => g.id === activeGameId) || null;
  const allowShort = Boolean(activeGame?.allow_short);

  useEffect(() => {
    if (isLong && (side === "short" || side === "cover")) setSide("buy");
    if (isShort && (side === "buy" || side === "sell")) setSide("cover");
  }, [isLong, isShort]);

  const maxShares = side === "buy" || side === "short"
    ? (ticketPrice && ticketPrice > 0 ? Math.max(1, Math.floor(cashAvail / ticketPrice)) : 1000)
    : side === "sell"
      ? Math.max(1, isLong ? currentPositionShares : 1)
      : Math.max(1, isShort ? Math.abs(currentPositionShares) : 1);
  const estCost = ticketPrice ? ticketPrice * shares : undefined;
  const cashAfter = side === "buy" || side === "cover" ? cashAvail - (estCost ?? 0) : cashAvail + (estCost ?? 0);
  const insufficientFunds = (side === "buy" || side === "cover") && estCost != null && estCost > cashAvail;

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
    if ((side === "short" || side === "cover") && !allowShort) return toast({ title: "Shorting is disabled in this game", description: "Create a game with short selling enabled to use this action.", variant: "destructive" });
    if (insufficientFunds) return toast({ title: "Insufficient funds", description: "You need more cash to place this trade.", variant: "destructive" });
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
    setLeaderboardRefresh((n) => n + 1);
  };

  const cancelOrder = async (id: string) => {
    const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast({ title: "Cancel failed", description: error.message, variant: "destructive" });
    toast({ title: "Order cancelled" });
    reloadPortfolio();
  };

  const signOut = async () => { await supabase.auth.signOut(); nav("/auth"); };

  const handleLogoutFromGame = () => {
    setActiveGameId(null);
    setShowSettings(false);
    setShowMenu(false);
    toast({ title: "Logged out of game", description: "You can now search for or create a new game." });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Trading Simulator — Integral Stocks"
        description="Multiplayer paper-trading simulator with live prices, leaderboards, limit/stop orders, and shareable game codes."
        path="/simulator"
      />
      <h1 className="sr-only">Trading Simulator</h1>
      <Header onSearch={(s) => nav(`/sim/trade/${s.toUpperCase()}`)} />
      <div className="border-b bg-gradient-to-r from-card via-card to-muted/30 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => nav("/")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Home</button>
            <span className="text-muted-foreground">/</span>
            <span className="font-bold tracking-tight bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent">Simulator</span>
            {activeGameId && (() => {
              const g = games.find((x) => x.id === activeGameId);
              if (!g) return null;
              return (
                <div className="flex items-center gap-2 flex-wrap ml-2">
                  <span className="font-bold text-sm">{g.name}</span>
                  <button onClick={() => copyCode(g.join_code)}
                    className="px-2 py-1 text-[11px] rounded-md bg-muted/70 border border-border/50 flex items-center gap-1 hover:bg-muted transition-colors tabular-nums"
                    title="Copy join code to share with friends">
                    <Copy className="w-3 h-3" /> {g.join_code}
                  </button>
                  {g.created_by === userId && (
                    <>
                      <button onClick={() => togglePublic(g)}
                        className="px-2 py-1 text-[11px] rounded-md bg-muted/70 border border-border/50 hidden md:flex items-center gap-1 hover:bg-muted transition-colors"
                        title={g.is_public ? "Public — anyone can browse and join" : "Private — code required"}>
                        {g.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {g.is_public ? "Public" : "Private"}
                      </button>
                      <button onClick={() => setShowDev(true)}
                        className="px-2 py-1 text-[11px] rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 hidden md:flex items-center gap-1 font-semibold hover:bg-amber-500/25 transition-colors"
                        title="Creator dev tools">
                        <Wrench className="w-3 h-3" /> Dev
                      </button>
                    </>
                  )}
                </div>
              );
            })()}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && <span className="rounded-full border border-amber-400/50 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">Admin</span>}
            <button onClick={() => setShowSettings(true)}
              className="px-3 py-1.5 text-xs rounded-md bg-muted text-foreground flex items-center gap-1 shadow-sm hover:bg-accent transition"
              title="Settings and game session controls">
              <Wrench className="w-3.5 h-3.5" /> Settings
            </button>
            <button onClick={() => setShowMenu(true)}
              className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground flex items-center gap-1 shadow-sm hover:shadow-md hover:opacity-95 transition"
              title="Browse, join, create or switch games">
              <Menu className="w-3.5 h-3.5" /> Games menu
            </button>
            <button onClick={signOut} className="px-2 py-1.5 text-xs rounded text-muted-foreground hover:text-foreground" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {!activeMember ? (
          <div className="bg-card border rounded-lg p-8 text-center max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-2">Welcome to the Simulator</h2>
            <p className="text-muted-foreground mb-5">Pick how you want to start. You'll trade inside one focused game at a time.</p>
            <div className="rounded-xl border bg-muted/40 p-3 text-left text-sm text-muted-foreground">
              <label className="text-[11px] uppercase tracking-[0.2em] font-semibold text-foreground">Find or create a game</label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                  placeholder="Search game name or join code"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setSearchQuery((v) => v.trim())}
                  className="rounded-md border bg-background px-3 py-2 text-muted-foreground hover:text-foreground"
                  aria-label="Search public games"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {publicLoading ? (
                  <p className="text-xs text-muted-foreground">Loading public games…</p>
                ) : filteredPublicGames.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No public games match this search yet.</p>
                ) : (
                  filteredPublicGames.slice(0, 6).map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => joinGameById(g.id, Number(g.starting_cash), g.join_code)}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-left hover:border-primary hover:bg-accent/30"
                    >
                      <div className="text-sm font-semibold">{g.name}</div>
                      <div className="text-[11px] text-muted-foreground">Code {g.join_code} · ${formatNumber(Number(g.starting_cash))} start</div>
                    </button>
                  ))
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Create a new game</button>
              <button onClick={() => setShowJoin(true)} className="px-4 py-2.5 rounded-lg bg-muted font-semibold flex items-center justify-center gap-2"><Users className="w-4 h-4" /> Join with a code</button>
              <button onClick={() => setShowBrowse(true)} className="px-4 py-2.5 rounded-lg bg-muted font-semibold flex items-center justify-center gap-2"><Search className="w-4 h-4" /> Browse public games</button>
            </div>
          </div>
        ) : (
          <>
            {showHelp && (
              <div className="bg-accent text-accent-foreground border border-primary/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 shrink-0 text-primary mt-0.5" />
                  <div className="min-w-0 flex-1 text-sm">
                    <button
                      type="button"
                      onClick={() => setShowHelpExpanded((v) => !v)}
                      className="w-full text-left flex items-center justify-between gap-3"
                      aria-expanded={showHelpExpanded}
                    >
                      <span>
                        <span className="font-bold block">How to use the simulator</span>
                        <span className="text-muted-foreground text-xs">Tap to expand or collapse this tip.</span>
                      </span>
                      {showHelpExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    {showHelpExpanded && (
                      <p className="mt-3 text-muted-foreground">Use the <b>Place order</b> panel to buy and sell with virtual cash. Track your gains in the stats below and climb the leaderboard. Tap <b>Games menu</b> (top right) to switch, create, or join another game.</p>
                    )}
                  </div>
                  <button onClick={dismissHelp} title="Dismiss" className="shrink-0 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>
              </div>
            )}
            <nav className="flex md:flex-wrap gap-2 rounded-xl border bg-card p-2 shadow-sm sticky top-2 z-10 overflow-x-auto no-scrollbar">
              {[
                { id: "overview", label: "Overview" },
                { id: "holdings", label: "Holdings" },
                { id: "transactions", label: "Transactions" },
                { id: "pending-orders", label: "Pending Orders" },
                { id: "leaderboard", label: "Leaderboard" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => jumpToSection(tab.id)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-semibold transition-colors shrink-0 whitespace-nowrap",
                    activeSection === tab.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div id="overview" className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Stat label="Cash" value={`$${formatNumber(Number(activeMember.cash))}`} />
              <Stat label="Holdings" value={`$${formatNumber(portfolioValue)}`} />
              <Stat label="Equity" value={`$${formatNumber(equity)}`} />
              <Stat label="Day P&L" value={`${dayPL >= 0 ? "+" : ""}$${formatNumber(dayPL)}`}
                cls={dayPL >= 0 ? "text-up" : "text-down"}
                hint="Today's gain or loss across all your holdings, vs. yesterday's closing prices." />
              <Stat label="Total Return" value={`${totalReturnPct >= 0 ? "+" : ""}${formatNumber(totalReturnPct)}%`}
                cls={totalReturnPct >= 0 ? "text-up" : "text-down"}
                hint="How much your total equity is up or down since the game's starting cash." />
            </div>


            <div className="grid lg:grid-cols-[1fr_360px] gap-6">
              <section id="holdings" className="bg-card border rounded-xl p-5 shadow-sm order-2 lg:order-1">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold">Positions & earnings</h3>
                    <p className="text-xs text-muted-foreground">See how each holding contributes to your portfolio and overall gains.</p>
                  </div>
                </div>
                {positions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No positions yet. Place an order to begin.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted-foreground border-b">
                        <tr><th className="text-left py-2">Symbol</th><th className="text-right">Shares</th>
                          <th className="text-right">Avg Cost</th><th className="text-right">Last</th>
                          <th className="text-right">Value</th><th className="text-right">Trade</th><th className="text-right">P&amp;L</th></tr>
                      </thead>
                      <tbody>
                        {positions.map((p) => (
                          <PositionRow
                            key={p.id}
                            p={p}
                            last={prices[p.symbol] ?? Number(p.avg_cost)}
                            onClick={() => nav(`/sim/trade/${p.symbol}`)}

                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {positions.length > 0 && (
                  <div className="mt-4 rounded-xl border bg-muted/30 p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold">Earnings pie chart</h4>
                        <p className="text-[11px] text-muted-foreground">Green and red slices reflect gains and losses by position.</p>
                      </div>
                    </div>
                    <Allocation
                      cash={Number(activeMember.cash)}
                      rows={positions.map((p) => ({
                        symbol: p.symbol,
                        value: (prices[p.symbol] ?? Number(p.avg_cost)) * Number(p.shares),
                        avgCost: Number(p.avg_cost),
                        last: prices[p.symbol] ?? Number(p.avg_cost),
                      }))}
                    />
                  </div>
                )}
              </section>

              <aside id="order-form" className="bg-card border rounded-xl p-5 shadow-sm order-1 lg:order-2">
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
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Shares</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number" min={1} max={maxShares}
                          value={shares}
                          onChange={(e) => setShares(Math.max(1, Math.min(maxShares, Number(e.target.value) || 1)))}
                          className="w-20 px-2 py-1 bg-muted rounded text-right tabular-nums text-sm font-semibold outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button type="button" onClick={() => setShares(maxShares)}
                          className="text-[10px] px-1.5 py-1 rounded bg-muted hover:bg-accent font-semibold uppercase">
                          Max
                        </button>
                      </div>
                    </div>
                    <Slider
                      value={[Math.min(shares, maxShares)]}
                      min={1}
                      max={maxShares}
                      step={1}
                      onValueChange={(v) => setShares(v[0])}
                    />
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
                      <span>1</span>
                      <span>
                        {ticketPrice ? `@ $${formatNumber(ticketPrice)} · ` : ""}
                        {estCost != null ? `≈ $${formatNumber(estCost)}` : "—"}
                      </span>
                      <span>{maxShares}</span>
                    </div>
                  </div>
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
                  {insufficientFunds && (
                    <p className="text-[11px] font-semibold text-down">Insufficient Funds</p>
                  )}
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 border px-3 py-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                      Live price · {symbol || "—"}
                    </span>
                    <span className="text-base font-bold tabular-nums">
                      {ticketPrice ? `$${formatNumber(ticketPrice)}` : "—"}
                    </span>
                  </div>
                  <button disabled={placing || insufficientFunds || (side === "short" && !allowShort)} className={cn(
                    "w-full py-2.5 rounded-lg font-semibold text-white shadow-sm hover:shadow-md transition disabled:opacity-60",
                    side === "buy" || side === "cover" ? "bg-up hover:brightness-110" : "bg-down hover:brightness-110"
                  )}>
                    {placing ? "Placing…" : `${side === "buy" ? "Buy" : side === "sell" ? "Sell" : side === "short" ? "Short" : "Cover"} ${shares || ""} ${symbol}`}
                  </button>
                  <p className="text-[10px] text-muted-foreground">
                    After-hours orders are queued and filled at the next live print.
                  </p>
                </form>
              </aside>
            </div>

            <Leaderboard gameId={activeGameId!} refreshKey={leaderboardRefresh} />

            <section id="pending-orders" className="bg-card border rounded-xl p-5 shadow-sm">
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

            <section id="transactions" className="bg-card border rounded-xl p-5 shadow-sm">
              <h3 className="font-bold mb-3">Recent transactions</h3>
              {txs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No trades yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr><th className="text-left py-2">Time</th><th className="text-left">Symbol</th><th>Side</th><th className="text-right">Shares</th><th className="text-right">Price</th></tr>
                  </thead>
                  <tbody>
                    {txs.slice(txPage * TX_PAGE_SIZE, txPage * TX_PAGE_SIZE + TX_PAGE_SIZE).map((t) => (
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
              {txs.length > TX_PAGE_SIZE && (
                <div className="flex items-center justify-between mt-3 text-xs">
                  <button
                    type="button"
                    disabled={txPage === 0}
                    onClick={() => setTxPage((p) => Math.max(0, p - 1))}
                    className="px-3 py-1.5 rounded bg-muted hover:bg-accent font-semibold disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-muted-foreground tabular-nums">
                    {txPage * TX_PAGE_SIZE + 1}–{Math.min((txPage + 1) * TX_PAGE_SIZE, txs.length)} of {txs.length}
                  </span>
                  <button
                    type="button"
                    disabled={(txPage + 1) * TX_PAGE_SIZE >= txs.length}
                    onClick={() => setTxPage((p) => ((p + 1) * TX_PAGE_SIZE < txs.length ? p + 1 : p))}
                    className="px-3 py-1.5 rounded bg-muted hover:bg-accent font-semibold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {showSettings && (
        <SettingsModal
          isAdmin={isAdmin}
          activeGameId={activeGameId}
          gameName={games.find((g) => g.id === activeGameId)?.name ?? ""}
          startingCash={games.find((g) => g.id === activeGameId)?.starting_cash ?? 100000}
          commission={games.find((g) => g.id === activeGameId)?.commission ?? 0}
          onClose={() => setShowSettings(false)}
          onLogout={handleLogoutFromGame}
          onUpdated={() => reloadGames()}
        />
      )}
      {showMenu && (
        <GameMenuModal
          games={games}
          activeGameId={activeGameId}
          onClose={() => setShowMenu(false)}
          onSelect={(id) => { setActiveGameId(id); setShowMenu(false); }}
          onCreate={() => { setShowMenu(false); setShowCreate(true); }}
          onJoin={() => { setShowMenu(false); setShowJoin(true); }}
          onBrowse={() => { setShowMenu(false); setShowBrowse(true); }}
          onCopy={copyCode}
        />
      )}
      {showCreate && <CreateGameModal onClose={() => setShowCreate(false)} onCreate={createGame} />}
      {showJoin && <JoinGameModal onClose={() => setShowJoin(false)} onJoin={joinGame} />}
      {showBrowse && (
        <BrowseGamesModal
          onClose={() => setShowBrowse(false)}
          onJoin={(g) => joinGameById(g.id, Number(g.starting_cash), g.join_code)}
        />
      )}
      {showDev && activeMember && (
        <DevModal
          onClose={() => setShowDev(false)}
          memberId={activeMember.id}
          gameId={activeGameId!}
          currentCash={Number(activeMember.cash)}
          onChanged={() => { reloadGames(); reloadPortfolio(); }}
        />
      )}
    </div>
  );
};

const Stat = ({ label, value, cls, hint }: { label: string; value: string; cls?: string; hint?: string }) => (
  <div className="relative overflow-hidden bg-gradient-to-br from-card to-muted/40 border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
    <div className="text-[10px] text-muted-foreground uppercase tracking-[0.18em] font-bold flex items-center gap-1">
      {label}
      {hint && <HelpCircle className="w-3 h-3 cursor-help opacity-60" aria-label={hint}><title>{hint}</title></HelpCircle>}
    </div>
    <div className={cn("text-2xl font-bold tabular-nums mt-1", cls)}>{value}</div>
  </div>
);


const Leaderboard = ({ gameId, refreshKey }: { gameId: string; refreshKey?: number }) => {
  const [rows, setRows] = useState<{ name: string; equity: number; pct: number }[]>([]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data: game } = await supabase.from("games").select("starting_cash").eq("id", gameId).maybeSingle();
      const start = Number(game?.starting_cash ?? 100000) || 100000;
      const { data: ms } = await supabase.from("game_members").select("id, user_id, cash").eq("game_id", gameId);
      if (!ms || !alive) return;
      const userIds = ms.map((m) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
      const result: { name: string; equity: number; pct: number }[] = [];
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
        const pct = start > 0 ? ((value - start) / start) * 100 : 0;
        result.push({ name, equity: value, pct });
      }
      result.sort((a, b) => b.equity - a.equity);
      if (alive) setRows(result);
    };
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, [gameId, refreshKey]);
  return (
    <section id="leaderboard" className="bg-card border rounded-xl p-5 shadow-sm">
      <h3 className="font-bold mb-3">Leaderboard</h3>
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground border-b">
          <tr><th className="text-left py-2 w-12">#</th><th className="text-left">Trader</th><th className="text-right">Return</th><th className="text-right">Equity</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="py-2 font-semibold">{i + 1}</td>
              <td>{r.name}</td>
              <td className={cn("text-right tabular-nums font-semibold", r.pct >= 0 ? "text-up" : "text-down")}>
                {r.pct >= 0 ? "+" : ""}{formatNumber(r.pct)}%
              </td>
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

const Allocation = ({ cash, rows }: { cash: number; rows: { symbol: string; value: number; avgCost: number; last: number }[] }) => {
  const holdings = rows.filter((r) => r.value > 0);
  const maxAbsGain = Math.max(1, ...holdings.map((r) => Math.abs((r.last - r.avgCost) * Number(r.value / r.last || 0))));

  const data = holdings.map((r) => {
    const shares = r.value / r.last;
    const gainLoss = (r.last - r.avgCost) * shares;
    const changePct = r.avgCost > 0 ? ((r.last - r.avgCost) / r.avgCost) * 100 : 0;
    const lightness = Math.max(35, 65 - Math.min(25, (Math.abs(gainLoss) / maxAbsGain) * 25));
    const hue = gainLoss >= 0 ? 142 : 12;
    return {
      name: r.symbol,
      value: r.value,
      gainLoss,
      changePct,
      fill: `hsl(${hue} 70% ${lightness}%)`,
    };
  });

  if (!data.length) return null;

  return (
    <div className="mt-4 pt-4 border-t">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold">Portfolio pie chart</h4>
          <p className="text-[11px] text-muted-foreground">Slice size reflects position value; hover for dollar value and gain/loss.</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div className="font-semibold text-foreground">Cash: ${formatNumber(cash)}</div>
          <div>Total holdings: ${formatNumber(rows.reduce((sum, r) => sum + r.value, 0))}</div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_220px] items-center">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={48}
                outerRadius={88}
                paddingAngle={2}
                label={({ name }) => name}
                labelLine={false}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, _name, entry: any) => {
                  const gainLoss = entry?.payload?.gainLoss ?? 0;
                  return [
                    <span key="value">$${formatNumber(Number(value))}</span>,
                    entry?.payload?.name ?? "Holding",
                    <span key="gain" className={cn("block text-[11px]", gainLoss >= 0 ? "text-up" : "text-down")}>P/L: {gainLoss >= 0 ? "+" : ""}${formatNumber(gainLoss)}</span>,
                  ];
                }}
                contentStyle={{ borderRadius: 12, borderColor: "hsl(var(--border))" }}
                labelFormatter={(label) => `Holding ${label}`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-2 text-xs">
          {data.map((item) => (
            <li key={item.name} className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
              <span className="flex items-center gap-2 min-w-0">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                <span className="font-semibold truncate">{item.name}</span>
              </span>
              <span className="text-right tabular-nums text-muted-foreground">
                {item.gainLoss >= 0 ? "+" : ""}${formatNumber(item.gainLoss)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const SettingsModal = ({
  isAdmin,
  activeGameId,
  gameName,
  startingCash,
  commission,
  onClose,
  onLogout,
  onUpdated,
}: {
  isAdmin: boolean;
  activeGameId: string | null;
  gameName: string;
  startingCash: number;
  commission: number;
  onClose: () => void;
  onLogout: () => void;
  onUpdated: () => void;
}) => {
  const [panel, setPanel] = useState<"overview" | "members" | "settings">("overview");
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [draft, setDraft] = useState({ name: gameName, starting_cash: startingCash, commission });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft({ name: gameName, starting_cash: startingCash, commission });
  }, [gameName, startingCash, commission]);

  useEffect(() => {
    if (!activeGameId || panel !== "members") return;
    let alive = true;
    (async () => {
      setLoadingMembers(true);
      const { data } = await supabase.from("game_members").select("*").eq("game_id", activeGameId).order("cash", { ascending: false });
      if (!alive) return;
      setMembers((data ?? []) as any[]);
      setLoadingMembers(false);
    })();
    return () => { alive = false; };
  }, [activeGameId, panel]);

  const saveSettings = async () => {
    if (!activeGameId) return;
    setSaving(true);
    const { error } = await supabase.from("games").update({
      name: draft.name.trim(),
      starting_cash: Number(draft.starting_cash),
      commission: Number(draft.commission),
    }).eq("id", activeGameId);
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Game settings updated" });
    onUpdated();
  };

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-lg">Settings</h3>
          <p className="text-xs text-muted-foreground">Your simulator session stays active until you log out manually.</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
      </div>
      <div className="space-y-3 text-sm">
        <section className="rounded-lg border bg-muted/50 p-3 space-y-2">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Admin status</div>
          <div className="font-semibold">{isAdmin ? "Full admin access enabled" : "Standard player access"}</div>
          <p className="text-xs text-muted-foreground">Admin users can manage simulator settings and user tools from this workspace.</p>
          {isAdmin && (
            <div className="grid gap-2">
              <button onClick={() => setPanel("members")} className={cn("rounded-md border bg-background px-3 py-2 text-left text-sm font-semibold", panel === "members" && "border-primary bg-accent")}>User management</button>
              <button onClick={() => setPanel("settings")} className={cn("rounded-md border bg-background px-3 py-2 text-left text-sm font-semibold", panel === "settings" && "border-primary bg-accent")}>Simulator settings</button>
            </div>
          )}
        </section>

        {isAdmin && panel === "members" && (
          <section className="rounded-lg border bg-muted/40 p-3 space-y-2">
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Game members</div>
            {loadingMembers ? <p className="text-xs text-muted-foreground">Loading members…</p> : members.length === 0 ? <p className="text-xs text-muted-foreground">No members found in this game.</p> : (
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {members.map((m) => (
                  <li key={m.id} className="rounded-md border bg-background px-3 py-2 text-xs">
                    <div className="font-semibold">User ID: {m.user_id}</div>
                    <div className="text-muted-foreground">Cash: ${formatNumber(Number(m.cash))}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {isAdmin && panel === "settings" && (
          <section className="rounded-lg border bg-muted/40 p-3 space-y-2">
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Game settings</div>
            <label className="block text-xs text-muted-foreground">Game name</label>
            <input value={draft.name} onChange={(e) => setDraft((v) => ({ ...v, name: e.target.value }))} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
            <label className="block text-xs text-muted-foreground">Starting cash</label>
            <input type="number" min={1000} step={1000} value={draft.starting_cash} onChange={(e) => setDraft((v) => ({ ...v, starting_cash: Number(e.target.value) }))} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
            <label className="block text-xs text-muted-foreground">Commission</label>
            <input type="number" min={0} step={0.5} value={draft.commission} onChange={(e) => setDraft((v) => ({ ...v, commission: Number(e.target.value) }))} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
            <button onClick={saveSettings} disabled={saving} className="w-full rounded-lg bg-primary text-primary-foreground px-4 py-2.5 font-semibold disabled:opacity-60">{saving ? "Saving…" : "Save settings"}</button>
          </section>
        )}

        <button onClick={onLogout} className="w-full rounded-lg bg-down/10 text-down border border-down/30 px-4 py-2.5 font-semibold hover:bg-down/20">Log Out of Game</button>
      </div>
    </Modal>
  );
};

const GameMenuModal = ({ games, activeGameId, onClose, onSelect, onCreate, onJoin, onBrowse, onCopy }: {
  games: Game[];
  activeGameId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onJoin: () => void;
  onBrowse: () => void;
  onCopy: (code: string) => void;
}) => (
  <Modal onClose={onClose}>
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-bold text-lg">Games menu</h3>
      <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
    </div>
    {games.length > 0 && (
      <div className="mb-4">
        <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">Your games</div>
        <ul className="space-y-1.5 max-h-60 overflow-y-auto">
          {games.map((g) => (
            <li key={g.id}>
              <div className={cn("flex items-center gap-2 rounded-lg border p-2.5", g.id === activeGameId ? "border-primary bg-accent/50" : "bg-card")}>
                <button onClick={() => onSelect(g.id)} className="flex-1 text-left min-w-0">
                  <div className="font-semibold text-sm truncate">{g.name}</div>
                  <div className="text-[11px] text-muted-foreground">{g.id === activeGameId ? "Active now" : "Tap to switch"}</div>
                </button>
                <button onClick={() => onCopy(g.join_code)} title="Copy join code"
                  className="px-2 py-1 text-[11px] rounded-md bg-muted/70 border flex items-center gap-1 tabular-nums shrink-0">
                  <Copy className="w-3 h-3" /> {g.join_code}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    )}
    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">Start or join another</div>
    <div className="flex flex-col gap-2">
      <button onClick={onCreate} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Create a new game</button>
      <button onClick={onJoin} className="px-4 py-2.5 rounded-lg bg-muted font-semibold flex items-center justify-center gap-2"><Users className="w-4 h-4" /> Join with a code</button>
      <button onClick={onBrowse} className="px-4 py-2.5 rounded-lg bg-muted font-semibold flex items-center justify-center gap-2"><Search className="w-4 h-4" /> Browse public games</button>
    </div>
  </Modal>
);

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

const PositionRow = ({
  p, last, onClick,
}: {
  p: Position;
  last: number;
  onClick: () => void;
}) => {
  const flash = useFlash(last);
  const value = last * Number(p.shares);
  const pl = (last - Number(p.avg_cost)) * Number(p.shares);
  const pct = ((last - Number(p.avg_cost)) / Number(p.avg_cost)) * 100;
  // Highlight symbol when overall return crosses ±5%.
  const symBg =
    pct >= 5 ? "bg-up/15 text-up" :
    pct <= -5 ? "bg-down/15 text-down" : "";
  return (
    <tr onClick={onClick} className="border-b last:border-0 cursor-pointer hover:bg-muted/40 transition-colors">
      <td className="py-2">
        <span className={cn("font-semibold rounded px-1.5 py-0.5", symBg)}>{p.symbol}</span>
      </td>
      <td className="text-right tabular-nums">{p.shares}</td>
      <td className="text-right tabular-nums">{formatNumber(p.avg_cost)}</td>
      <td className="text-right tabular-nums">
        <span className={cn(
          "rounded px-1.5 py-0.5 transition-colors",
          flash === "up" && "bg-up/20 text-up",
          flash === "down" && "bg-down/20 text-down",
        )}>
          {formatNumber(last)}
        </span>
      </td>
      <td className="text-right tabular-nums">{formatLargeNumber(value)}</td>
      <td className="text-right">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="inline-flex items-center rounded-full border border-primary/30 bg-primary/8 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15"
        >
          Trade
        </button>
      </td>
      <td className={cn("text-right tabular-nums font-semibold", pl >= 0 ? "text-up" : "text-down")}>
        {pl >= 0 ? "+" : ""}{formatNumber(pl)} ({formatNumber(pct)}%)
      </td>
    </tr>
  );
};

const DevModal = ({
  onClose, memberId, gameId, currentCash, onChanged,
}: {
  onClose: () => void;
  memberId: string;
  gameId: string;
  currentCash: number;
  onChanged: () => void;
}) => {
  const [amount, setAmount] = useState(10000);
  const [busy, setBusy] = useState(false);

  const addCashToMe = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("game_members")
      .update({ cash: currentCash + amount })
      .eq("id", memberId);
    setBusy(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: `+ $${formatNumber(amount)} added` });
    onChanged();
  };

  // Note: RLS only allows updating your own membership row, so dev tools
  // are scoped to the creator's own portfolio.

  const resetMyCash = async () => {
    setBusy(true);
    const { data: g } = await supabase.from("games").select("starting_cash").eq("id", gameId).maybeSingle();
    const start = Number(g?.starting_cash ?? 100000);
    await supabase.from("positions").delete().eq("member_id", memberId);
    await supabase.from("orders").delete().eq("member_id", memberId).eq("status", "pending");
    const { error } = await supabase.from("game_members").update({ cash: start }).eq("id", memberId);
    setBusy(false);
    if (error) return toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    toast({ title: "Portfolio reset" });
    onChanged();
  };

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div onClick={(e) => e.stopPropagation()} className="bg-card border rounded-lg p-6 max-w-sm w-full">
        <div className="flex items-center gap-2 mb-1">
          <Wrench className="w-4 h-4 text-amber-500" />
          <h3 className="font-bold text-lg">Creator dev tools</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Only you (the game creator) can see this menu.
        </p>
        <div className="space-y-3">
          <label className="block text-xs text-muted-foreground">Amount ($)</label>
          <input
            type="number"
            value={amount}
            min={0}
            step={1000}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full px-3 py-2 bg-muted rounded outline-none"
          />
          <div className="grid gap-2">
            <button disabled={busy} onClick={addCashToMe}
              className="w-full py-2 rounded bg-primary text-primary-foreground font-semibold disabled:opacity-60">
              Add cash to me
            </button>
            <button disabled={busy} onClick={resetMyCash}
              className="w-full py-2 rounded border border-down text-down font-semibold disabled:opacity-60">
              Reset my portfolio
            </button>
          </div>
          <button onClick={onClose} className="w-full text-xs text-muted-foreground py-1">Close</button>
        </div>
      </div>
    </div>
  );
};

export default Sim;
