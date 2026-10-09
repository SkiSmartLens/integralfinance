import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/backend";
import { inviteLink } from "./GameLobby";
import { SEO } from "@/components/SEO";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatNumber, formatLargeNumber } from "@/lib/yahoo";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { AnimatedNumber } from "@/components/sim/AnimatedNumber";
import { MiniChart } from "@/components/sim/MiniChart";
import { NetWorthChart } from "@/components/sim/NetWorthChart";
import { SimSearch } from "@/components/sim/SimSearch";
import { TradeTicket } from "@/components/sim/TradeTicket";
import { HoldingsPanel, Holding } from "@/components/sim/HoldingsPanel";
import { WhyItMoved } from "@/components/sim/WhyItMoved";
import { SimCopilot } from "@/components/sim/SimCopilot";
import { SafetyMeter } from "@/components/sim/SafetyMeter";
import { Leaderboard } from "@/components/sim/Leaderboard";
import { ArrowLeft, LogOut, RefreshCw, Trophy, Copy, Check, Share2, LogIn, Users, Lock, Globe, DoorOpen, HelpCircle, Loader2, UserCog } from "lucide-react";
import { SimWalkthrough, hasSeenSimWalkthrough } from "@/components/sim/SimWalkthrough";
import { PostTradeCard } from "@/components/sim/PostTradeCard";
import { PortfolioBar } from "@/components/sim/PortfolioBar";
import { isUsMarketOpen, nextOpenLabel } from "@/lib/marketHours";


interface Member { id: string; game_id: string; user_id: string; cash: number; joined_at: string }
interface Position { id: string; symbol: string; shares: number; avg_cost: number }
interface Game {
  id: string;
  name: string;
  starting_cash: number;
  is_public: boolean;
  join_code: string;
  allow_short: boolean;
  leverage: number;
  duration_days: number | null;
  ends_at: string | null;
  created_by: string;
}

const usePriceFlash = (value?: number) => {
  const prev = useRef<number | undefined>(value);
  const [dir, setDir] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    if (value == null) return;
    if (prev.current != null && value !== prev.current) {
      setDir(value > prev.current ? "up" : "down");
      const t = setTimeout(() => setDir(null), 700);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);
  return dir;
};

const Sim = () => {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selected, setSelected] = useState("AAPL");
  const [placing, setPlacing] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [walkOpen, setWalkOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [lastTrade, setLastTrade] = useState<
    | { symbol: string; side: "buy" | "sell" | "short" | "cover"; shares: number; price?: number }
    | null
  >(null);

  // First-time walkthrough
  useEffect(() => {
    if (!hasSeenSimWalkthrough()) {
      const t = setTimeout(() => setWalkOpen(true), 400);
      return () => clearTimeout(t);
    }
  }, []);

  // ---- Auth ----
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) nav("/auth");
      else setUserId(s.user.id);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) nav("/auth");
      else setUserId(data.session.user.id);
    });
    return () => subscription.unsubscribe();
  }, [nav]);

  // ---- Your own display name (shown on leaderboards) ----
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => setDisplayName((data as any)?.display_name ?? null));
  }, [userId]);

  const editDisplayName = async () => {
    if (!userId) return;
    const next = prompt("Your display name (shown on leaderboards)", displayName ?? "");
    if (next == null) return;
    const trimmed = next.trim().slice(0, 40);
    if (!trimmed) return;
    const { error } = await supabase.from("profiles").update({ display_name: trimmed }).eq("user_id", userId);
    if (error) return toast({ title: "Couldn't update name", description: error.message, variant: "destructive" });
    setDisplayName(trimmed);
    toast({ title: "Name updated" });
  };

  // ---- Load active game (no auto-create) ----
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      const { data: ms } = await supabase.from("game_members").select("*").eq("user_id", userId);
      const list = (ms ?? []) as Member[];
      if (!list.length) {
        // First-time user: send them to the lobby to choose solo vs. friends.
        nav("/sim/lobby");
        return;
      }
      let saved: string | null = null;
      try { saved = localStorage.getItem("activeSimGame"); } catch {}
      const m = list.find((x) => x.game_id === saved) ?? list[0];
      if (!alive) return;
      setMember(m);
      const { data: g } = await supabase.from("games").select("*").eq("id", m.game_id).maybeSingle();
      if (alive && g) setGame(g as Game);
    })();
    return () => { alive = false; };
  }, [userId, nav]);

  const [portfolioLoaded, setPortfolioLoaded] = useState(false);
  const [portfolioError, setPortfolioError] = useState(false);

  const reloadPortfolio = async (m = member) => {
    if (!m) return;
    const [posRes, memberRes] = await Promise.all([
      supabase.from("positions").select("*").eq("member_id", m.id),
      supabase.from("game_members").select("*").eq("id", m.id).maybeSingle(),
    ]);
    // On a query error, keep showing the last-known-good data instead of silently
    // resetting positions to empty — that would make net worth look like just the
    // cash balance (a fake "loss") until the next successful refresh.
    if (posRes.error || memberRes.error) {
      console.error("reloadPortfolio failed", posRes.error, memberRes.error);
      setPortfolioError(true);
      return;
    }
    setPortfolioError(false);
    setPortfolioLoaded(true);
    setPositions((posRes.data ?? []) as Position[]);
    if (memberRes.data) setMember(memberRes.data as Member);
  };

  useEffect(() => { if (member) reloadPortfolio(member); /* eslint-disable-next-line */ }, [member?.id]);

  // Auto-retry a failed refresh instead of leaving the user stuck on stale/wrong numbers.
  useEffect(() => {
    if (!portfolioError || !member) return;
    const t = setTimeout(() => reloadPortfolio(member), 4000);
    return () => clearTimeout(t);
    /* eslint-disable-next-line */
  }, [portfolioError, member?.id]);

  // ---- Live quotes ----
  const symbols = useMemo(() => {
    const set = new Set<string>([selected]);
    positions.forEach((p) => set.add(p.symbol));
    return [...set];
  }, [selected, positions]);

  const { quotes, loading: quotesLoading } = useLiveQuotes(symbols, 5000);
  const quoteMap = useMemo(() => new Map(quotes.map((q) => [q.symbol, q])), [quotes]);

  const selQuote = quoteMap.get(selected);
  const selPrice = selQuote?.regularMarketPrice;
  const selChange = selQuote?.regularMarketChangePercent ?? 0;
  const flash = usePriceFlash(selPrice);
  // Regular-session check — gains and order entry are only live during trading hours.
  // Yahoo's marketState wins when we have it; the ET clock is the fallback so an
  // empty/stale quote list can't wrongly report "market closed" during the session.
  const states = quotes.map((q) => q.marketState).filter(Boolean) as string[];
  const marketOpen = states.length ? states.includes("REGULAR") : isUsMarketOpen();
  const nextOpen = nextOpenLabel();

  // Real financial figures should never be computed against a guessed starting
  // cash — until game/member/positions have all loaded, dataReady stays false
  // and the UI shows a loading state instead of a flash of "-100%" or similar.
  const dataReady = !!member && !!game && portfolioLoaded;
  const cash = Number(member?.cash ?? 0);
  const startingCash = Number(game?.starting_cash ?? 0);
  const buyingPower = startingCash * Number(game?.leverage ?? 1);
  const heldShares = Number(positions.find((p) => p.symbol === selected)?.shares ?? 0);

  const holdings: Holding[] = positions
    .filter((p) => Number(p.shares) !== 0)
    .map((p) => {
      const q = quoteMap.get(p.symbol);
      const last = q?.regularMarketPrice ?? Number(p.avg_cost);
      return {
        id: p.id,
        symbol: p.symbol,
        shares: Number(p.shares),
        avgCost: Number(p.avg_cost),
        last,
        prevClose: q?.regularMarketPreviousClose ?? last,
      };
    });

  const holdingsValue = holdings.reduce((s, h) => s + h.last * h.shares, 0);
  const equity = cash + holdingsValue;
  const dayPL = holdings.reduce((s, h) => s + (h.last - h.prevClose) * h.shares, 0);
  const totalReturnPct = startingCash > 0 ? ((equity - startingCash) / startingCash) * 100 : 0;

  // Net-worth history: no backend cron here, so the "every 12 hours" cadence is
  // enforced at write time instead — each visit checks the latest snapshot and
  // only inserts a new one once 12h have actually elapsed. Gated on quotesLoading
  // so the recorded equity reflects live prices, not cash-only before they arrive.
  useEffect(() => {
    if (!member || !dataReady || quotesLoading) return;
    let alive = true;
    (async () => {
      const { data: last } = await supabase
        .from("portfolio_snapshots")
        .select("recorded_at")
        .eq("member_id", member.id)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!alive) return;
      const lastAt = last?.recorded_at ? new Date(last.recorded_at).getTime() : 0;
      const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
      if (Date.now() - lastAt < TWELVE_HOURS_MS) return;
      await supabase.from("portfolio_snapshots").insert({ member_id: member.id, equity });
    })();
    return () => {
      alive = false;
    };
    /* eslint-disable-next-line */
  }, [member?.id, dataReady, quotesLoading]);

  const execute = async (side: "buy" | "sell" | "short" | "cover", shares: number, atOpen = false) => {
    if (!member) return;
    setPlacing(true);
    const { data, error } = await supabase.functions.invoke("place-order", {
      body: {
        member_id: member.id,
        symbol: selected,
        side,
        shares,
        order_type: atOpen || !marketOpen ? "market_on_open" : "market",
      },
    });
    setPlacing(false);
    if (error) {
      // functions.invoke returns a generic "non-2xx" message — read the real reason.
      let reason = error.message;
      try {
        const body = await (error as any)?.context?.json?.();
        if (body?.error) reason = body.error;
      } catch { /* keep generic message */ }
      return toast({ title: "Order failed", description: reason, variant: "destructive" });
    }
    if ((data as any)?.error) return toast({ title: "Order failed", description: (data as any).error, variant: "destructive" });
    const filledPrice = (data as any)?.price as number | undefined;
    const queued = !!(data as any)?.queued;
    toast({
      title: queued ? `Queued for market open (${nextOpen})` : `Filled @ $${formatNumber(filledPrice)}`,
      description: `${side} ${shares} ${selected}`,
    });
    if (!queued) setLastTrade({ symbol: selected, side, shares, price: filledPrice });
    reloadPortfolio(member);
  };

  // Release any market-on-open orders as soon as the session is live.
  useEffect(() => {
    if (!member || !marketOpen) return;
    let alive = true;
    (async () => {
      const { data } = await supabase.functions.invoke("place-order", {
        body: { member_id: member.id, action: "run_queued" },
      });
      const processed = (data as any)?.processed as any[] | undefined;
      if (!alive || !processed?.length) return;
      const filled = processed.filter((p) => p.filled).length;
      if (filled) {
        toast({ title: `${filled} queued order${filled === 1 ? "" : "s"} filled at the open` });
        reloadPortfolio(member);
      }
    })();
    return () => { alive = false; };
    /* eslint-disable-next-line */
  }, [member?.id, marketOpen]);

  const copyCode = () => {
    if (!game) return;
    navigator.clipboard.writeText(game.join_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 1500);
  };

  const shareInvite = async () => {
    if (!game) return;
    const url = inviteLink(game.join_code);
    if (navigator.share) {
      try {
        await navigator.share({ title: `Join "${game.name}" on Integral Stocks`, url });
        return;
      } catch {
        // cancelled or unsupported — fall through to clipboard
      }
    }
    navigator.clipboard.writeText(url);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 1500);
  };

  const signOut = async () => { await supabase.auth.signOut(); nav("/auth"); };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Your Simulator Game | IntegralStocks"
        description="Your paper-trading game: $100,000 of virtual cash, live prices, and market, limit, and stop orders."
        path="/sim"
        noindex
      />
      <h1 className="sr-only">Trading Simulator</h1>

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => nav("/")} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Home</span>
          </button>
          <span className="font-extrabold tracking-tight">Simulator</span>
          {game && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              {game.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {game.name}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => nav("/sim/lobby")}
              className="h-9 px-3 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors inline-flex items-center gap-1.5"
              title="Switch or create games"
            >
              <DoorOpen className="w-4 h-4" /> <span className="hidden sm:inline">Lobby</span>
            </button>
            <button
              onClick={() => reloadPortfolio(member)}
              className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center justify-center"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={editDisplayName}
              className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center justify-center"
              title="Edit your display name"
              aria-label="Edit your display name"
            >
              <UserCog className="w-4 h-4" />
            </button>
            <button
              onClick={() => setWalkOpen(true)}
              className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center justify-center"
              title="Show simulator tour"
              aria-label="Show simulator tour"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button onClick={signOut} className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center justify-center" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Join code — pinned to the corner so it's always visible, not buried in a menu. */}
      {game && !game.is_public && (
        <div className="fixed top-[70px] right-3 z-30 flex items-center gap-1 rounded-xl border-2 bg-card shadow-sm p-1">
          <button
            onClick={copyCode}
            title="Copy join code"
            className={cn(
              "h-8 px-2.5 rounded-lg text-xs font-extrabold tracking-widest inline-flex items-center gap-1.5 transition-colors",
              codeCopied ? "text-emerald-700" : "hover:text-primary",
            )}
          >
            {codeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {game.join_code}
          </button>
          <button
            onClick={shareInvite}
            title="Share invite link"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors flex items-center justify-center"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-5 space-y-5">
        {/* Portfolio header + allocation bar */}
        {!dataReady ? (
          <div className="rounded-3xl border bg-card px-6 py-10 flex items-center justify-center gap-2 text-sm text-muted-foreground shadow-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your portfolio…
          </div>
        ) : (
          <>
            {portfolioError && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900/60 px-4 py-2.5 text-xs font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Couldn't refresh your portfolio — retrying…
              </div>
            )}
            {member && (
              <NetWorthChart
                memberId={member.id}
                joinedAt={member.joined_at}
                equity={equity}
                startingCash={startingCash}
              />
            )}
            <PortfolioBar
              equity={equity}
              buyingPower={buyingPower}
              dayPL={dayPL}
              marketOpen={marketOpen}
              totalReturnPct={totalReturnPct}
              holdings={holdings}
              onSelect={setSelected}
            />
            <SafetyMeter holdings={holdings} cash={cash} equity={equity} />
          </>
        )}


        {/* Search */}
        <SimSearch onSelect={setSelected} />

        <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
          {/* Stock info */}
          <section className="space-y-4 order-2 lg:order-1">
            <div className="rounded-3xl border-2 bg-card p-4 sm:p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h2 className="text-xl font-extrabold tracking-tight">{selected}</h2>
                    <span className="text-sm text-muted-foreground truncate">{selQuote?.shortName || selQuote?.longName || ""}</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span
                      className={cn(
                        "text-3xl font-bold tabular-nums rounded px-1 -mx-1 transition-colors",
                        flash === "up" && "bg-emerald-500/20 text-emerald-600",
                        flash === "down" && "bg-rose-400/20 text-rose-600",
                      )}
                    >
                      {selPrice != null ? <AnimatedNumber value={selPrice} format={(n) => `$${formatNumber(n)}`} /> : "—"}
                    </span>
                    <span className={cn("text-sm font-semibold tabular-nums", selChange >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {selChange >= 0 ? "+" : ""}{formatNumber(selChange)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <MiniChart symbol={selected} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                <Stat label="Volume" value={selQuote?.regularMarketVolume ? formatLargeNumber(selQuote.regularMarketVolume) : "—"} />
                <Stat label="Market cap" value={selQuote?.marketCap ? `$${formatLargeNumber(selQuote.marketCap)}` : "—"} />
                <Stat
                  label="Day range"
                  value={
                    selQuote?.regularMarketDayLow != null && selQuote?.regularMarketDayHigh != null
                      ? `${formatNumber(selQuote.regularMarketDayLow)}–${formatNumber(selQuote.regularMarketDayHigh)}`
                      : "—"
                  }
                />
                <Stat label="P/E" value={selQuote?.trailingPE ? formatNumber(selQuote.trailingPE) : "—"} />
              </div>
            </div>

            <WhyItMoved symbol={selected} changePct={selChange} />

            <HoldingsPanel holdings={holdings} onSelect={setSelected} />
            {member && game && userId && (
              <Leaderboard gameId={game.id} meUserId={userId} startingCash={startingCash} />
            )}
          </section>

          {/* Trade */}
          <aside className="order-1 lg:order-2 lg:sticky lg:top-20 space-y-3">
            {member ? (
              <TradeTicket
                symbol={selected}
                price={selPrice}
                cash={cash}
                shortPower={Math.max(0, buyingPower - Math.abs(holdingsValue))}
                heldShares={heldShares}
                allowShort={game?.allow_short ?? false}
                marketOpen={marketOpen}
                nextOpen={nextOpen}
                placing={placing}
                onExecute={execute}
              />

            ) : (
              <div className="rounded-3xl border-2 bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">
                <button onClick={() => nav("/sim/lobby")} className="inline-flex items-center gap-2 text-primary font-bold">
                  <LogIn className="w-4 h-4" /> Choose a game to start
                </button>
              </div>
            )}
            {lastTrade && (
              <PostTradeCard
                symbol={lastTrade.symbol}
                side={lastTrade.side}
                shares={lastTrade.shares}
                price={lastTrade.price}
                holdings={holdings}
                equity={equity}
                changePct={selChange}
                onDismiss={() => setLastTrade(null)}
              />
            )}
            <div className="rounded-2xl border bg-muted/30 p-3 flex items-start gap-2.5">
              <Trophy className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                {game?.is_public ? (
                  <>Public game · <span className="font-semibold text-foreground">${formatNumber(startingCash)}</span> starting cash</>
                ) : (
                  <>Practice with <span className="font-semibold text-foreground">${formatNumber(startingCash)}</span> in virtual cash — zero real risk.</>
                )}
              </p>
            </div>
            <SimCopilot
              cash={cash}
              startingCash={startingCash}
              equity={equity}
              holdings={holdings}
              selected={selected}
              selectedChangePct={selChange}
            />
          </aside>
        </div>
      </main>
      <SimWalkthrough open={walkOpen} onClose={() => setWalkOpen(false)} />
    </div>
  );
};


const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-muted/40 border p-2.5">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
    <div className="text-sm font-semibold tabular-nums mt-0.5">{value}</div>
  </div>
);

export default Sim;
