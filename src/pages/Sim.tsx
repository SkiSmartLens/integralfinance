import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { fetchQuotes, formatNumber, formatLargeNumber } from "@/lib/yahoo";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { AnimatedNumber } from "@/components/sim/AnimatedNumber";
import { MiniChart } from "@/components/sim/MiniChart";
import { SimSearch } from "@/components/sim/SimSearch";
import { TradeTicket } from "@/components/sim/TradeTicket";
import { HoldingsPanel, Holding } from "@/components/sim/HoldingsPanel";
import { WhyItMoved } from "@/components/sim/WhyItMoved";
import { ArrowLeft, LogOut, RefreshCw, Trophy } from "lucide-react";

interface Member { id: string; game_id: string; user_id: string; cash: number }
interface Position { id: string; symbol: string; shares: number; avg_cost: number }

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
  const [startingCash, setStartingCash] = useState(100000);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selected, setSelected] = useState("AAPL");
  const [placing, setPlacing] = useState(false);
  const [ready, setReady] = useState(false);

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

  // ---- Ensure a personal portfolio exists ----
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      const { data: ms } = await supabase.from("game_members").select("*").eq("user_id", userId);
      let list = (ms ?? []) as Member[];
      if (!list.length) {
        const { data: g } = await supabase
          .from("games")
          .insert({ name: "My Portfolio", starting_cash: 100000, commission: 0, allow_short: false, is_public: false, created_by: userId })
          .select()
          .single();
        if (g) {
          await supabase.from("game_members").upsert(
            { game_id: g.id, user_id: userId, cash: 100000 },
            { onConflict: "game_id,user_id", ignoreDuplicates: true }
          );
          const { data: ms2 } = await supabase.from("game_members").select("*").eq("user_id", userId);
          list = (ms2 ?? []) as Member[];
        }
      }
      if (!alive) return;
      let saved: string | null = null;
      try { saved = localStorage.getItem("activeSimGame"); } catch {}
      const m = list.find((x) => x.game_id === saved) ?? list[0] ?? null;
      setMember(m);
      setReady(true);
      if (m) {
        const { data: game } = await supabase.from("games").select("starting_cash").eq("id", m.game_id).maybeSingle();
        if (alive && game) setStartingCash(Number(game.starting_cash) || 100000);
      }
    })();
    return () => { alive = false; };
  }, [userId]);

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

  // ---- Live quotes for the selected symbol + all holdings ----
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

  const execute = async (side: "buy" | "sell", shares: number) => {
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
      description: `${side === "buy" ? "Bought" : "Sold"} ${shares} ${selected}`,
    });
    reloadPortfolio(member);
  };

  const signOut = async () => { await supabase.auth.signOut(); nav("/auth"); };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Trading Simulator — Practice Investing Risk-Free | Integral Stocks"
        description="A clean, modern paper-trading simulator. Search stocks, view live charts, trade with virtual cash, and track your profit and loss in real time."
        path="/simulator"
      />
      <h1 className="sr-only">Trading Simulator</h1>

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => nav("/")} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Home</span>
          </button>
          <span className="font-extrabold tracking-tight">Simulator</span>
          <div className="ml-auto flex items-center gap-1.5">
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
        {/* Portfolio summary */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard label="Equity" value={equity} prefix="$" />
          <SummaryCard label="Buying power" value={cash} prefix="$" />
          <SummaryCard label="Day P/L" value={dayPL} prefix="$" signed colored />
          <SummaryCard label="Total return" value={totalReturnPct} suffix="%" signed colored />
        </section>

        {/* Search */}
        <SimSearch onSelect={setSelected} />

        <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
          {/* Stock info */}
          <section className="space-y-4 order-2 lg:order-1">
            <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-sm">
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
                        flash === "up" && "bg-up/20 text-up",
                        flash === "down" && "bg-down/20 text-down"
                      )}
                    >
                      {selPrice != null ? <AnimatedNumber value={selPrice} format={(n) => `$${formatNumber(n)}`} /> : "—"}
                    </span>
                    <span className={cn("text-sm font-semibold tabular-nums", selChange >= 0 ? "text-up" : "text-down")}>
                      {selChange >= 0 ? "+" : ""}{formatNumber(selChange)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <MiniChart symbol={selected} />
              </div>

              {/* Key stats */}
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

            <WhyItMoved symbol={selected} />

            <HoldingsPanel holdings={holdings} onSelect={setSelected} />
          </section>

          {/* Trade */}
          <aside className="order-1 lg:order-2 lg:sticky lg:top-20">
            {ready && member ? (
              <TradeTicket
                symbol={selected}
                price={selPrice}
                cash={cash}
                heldShares={heldShares}
                placing={placing}
                onExecute={execute}
              />
            ) : (
              <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">
                <div className="inline-flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Setting up your portfolio…</div>
              </div>
            )}
            <div className="mt-3 rounded-xl border bg-muted/30 p-3 flex items-start gap-2.5">
              <Trophy className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                You start with <span className="font-semibold text-foreground">${formatNumber(startingCash)}</span> in virtual cash.
                Buy low, sell high, and watch your P/L update live — zero real risk.
              </p>
            </div>
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
  const cls = colored ? (value >= 0 ? "text-up" : "text-down") : "";
  const fmt = (n: number) => `${signed ? (n >= 0 ? "+" : "-") : ""}${prefix}${formatNumber(Math.abs(n))}${suffix}`;
  return (
    <div className="rounded-2xl border bg-card p-3.5 shadow-sm">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className={cn("text-xl sm:text-2xl font-bold tabular-nums mt-0.5", cls)}>
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
