import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/backend";
import { SEO } from "@/components/SEO";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatNumber, formatLargeNumber } from "@/lib/yahoo";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { AnimatedNumber } from "@/components/sim/AnimatedNumber";
import { MiniChart } from "@/components/sim/MiniChart";
import { SimSearch } from "@/components/sim/SimSearch";
import { TradeTicket } from "@/components/sim/TradeTicket";
import { HoldingsPanel, Holding } from "@/components/sim/HoldingsPanel";
import { WhyItMoved } from "@/components/sim/WhyItMoved";
import { SimCopilot } from "@/components/sim/SimCopilot";
import { SafetyMeter } from "@/components/sim/SafetyMeter";
import { Leaderboard } from "@/components/sim/Leaderboard";
import { ArrowLeft, LogOut, RefreshCw, Trophy, Copy, LogIn, Users, Lock, Globe, DoorOpen } from "lucide-react";

interface Member { id: string; game_id: string; user_id: string; cash: number }
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

  const reloadPortfolio = async (m = member) => {
    if (!m) return;
    const [{ data: pos }, { data: fresh }] = await Promise.all([
      supabase.from("positions").select("*").eq("member_id", m.id),
      supabase.from("game_members").select("*").eq("id", m.id).maybeSingle(),
    ]);
    setPositions((pos ?? []) as Position[]);
    if (fresh) setMember(fresh as Member);
  };

  useEffect(() => { if (member) reloadPortfolio(member); /* eslint-disable-next-line */ }, [member?.id]);

  // ---- Live quotes ----
  const symbols = useMemo(() => {
    const set = new Set<string>([selected]);
    positions.forEach((p) => set.add(p.symbol));
    return [...set];
  }, [selected, positions]);

  const { quotes } = useLiveQuotes(symbols, 5000);
  const quoteMap = useMemo(() => new Map(quotes.map((q) => [q.symbol, q])), [quotes]);

  const selQuote = quoteMap.get(selected);
  const selPrice = selQuote?.regularMarketPrice;
  const selChange = selQuote?.regularMarketChangePercent ?? 0;
  const flash = usePriceFlash(selPrice);

  const cash = Number(member?.cash ?? 0);
  const startingCash = Number(game?.starting_cash ?? 100000);
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

  const execute = async (side: "buy" | "sell" | "short" | "cover", shares: number) => {
    if (!member) return;
    setPlacing(true);
    const { data, error } = await supabase.functions.invoke("place-order", {
      body: { member_id: member.id, symbol: selected, side, shares, order_type: "market" },
    });
    setPlacing(false);
    if (error) return toast({ title: "Order failed", description: error.message, variant: "destructive" });
    if ((data as any)?.error) return toast({ title: "Order failed", description: (data as any).error, variant: "destructive" });
    toast({
      title: (data as any)?.queued ? "Order queued (after-hours)" : `Filled @ $${formatNumber((data as any)?.price)}`,
      description: `${side} ${shares} ${selected}`,
    });
    reloadPortfolio(member);
  };

  const copyCode = () => {
    if (!game) return;
    navigator.clipboard.writeText(game.join_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 1500);
  };

  const signOut = async () => { await supabase.auth.signOut(); nav("/auth"); };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Trading Simulator — Practice Investing Risk-Free | Integral Stocks"
        description="A clean, modern paper-trading simulator. Search stocks, view live charts, trade with virtual cash, and track your profit and loss in real time."
        path="/sim"
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
            {game && !game.is_public && (
              <button
                onClick={copyCode}
                title="Copy join code"
                className={cn(
                  "h-9 px-3 rounded-lg text-xs font-extrabold tracking-widest border-2 inline-flex items-center gap-1.5 transition-colors",
                  codeCopied ? "border-emerald-500 text-emerald-700 bg-emerald-50" : "border-border hover:border-primary",
                )}
              >
                <Copy className="w-3 h-3" /> {codeCopied ? "Copied" : game.join_code}
              </button>
            )}
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
            <button onClick={signOut} className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center justify-center" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5 space-y-5">
        {/* Portfolio summary + Safety Meter */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-3">
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard label="Equity" value={equity} prefix="$" />
            <SummaryCard label="Cash" value={cash} prefix="$" />
            <SummaryCard label="Day P/L" value={dayPL} prefix="$" signed colored />
            <SummaryCard label="Total return" value={totalReturnPct} suffix="%" signed colored />
          </div>
          <SafetyMeter holdings={holdings} cash={cash} equity={equity} />
        </section>

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
                heldShares={heldShares}
                allowShort={game?.allow_short ?? false}
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
    </div>
  );
};

const SummaryCard = ({
  label,
  value,
  prefix = "",
  suffix = "",
  signed = false,
  colored = false,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  signed?: boolean;
  colored?: boolean;
}) => {
  const cls = colored ? (value >= 0 ? "text-emerald-600" : "text-rose-600") : "";
  const fmt = (n: number) => `${signed ? (n >= 0 ? "+" : "-") : ""}${prefix}${formatNumber(Math.abs(n))}${suffix}`;
  return (
    <div className="rounded-2xl border-2 bg-card p-3.5 shadow-sm">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-extrabold">{label}</div>
      <div className={cn("text-xl sm:text-2xl font-extrabold tabular-nums mt-0.5", cls)}>
        <AnimatedNumber value={value} format={fmt} />
      </div>
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
