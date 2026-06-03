import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { StockChart } from "@/components/StockChart";
import { fetchQuotes, formatNumber, formatLargeNumber } from "@/lib/yahoo";
import { toast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { ArrowLeft, TrendingUp, TrendingDown, Zap, Shield } from "lucide-react";

type Side = "buy" | "sell" | "short" | "cover";
type OrderType = "market" | "limit" | "stop";

interface Game { id: string; name: string; starting_cash: number; allow_short?: boolean }
interface Member { id: string; game_id: string; cash: number }
interface Position { id: string; symbol: string; shares: number; avg_cost: number }

const Trade = () => {
  const { symbol: rawSym = "AAPL" } = useParams();
  const symbol = rawSym.toUpperCase();
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [quote, setQuote] = useState<any>(null);

  const [side, setSide] = useState<Side>("buy");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [shares, setShares] = useState(1);
  const [limitPrice, setLimitPrice] = useState<number | "">("");
  const [stopPrice, setStopPrice] = useState<number | "">("");
  const [placing, setPlacing] = useState(false);

  // Auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) nav("/auth"); else setUserId(s.user.id);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) nav("/auth"); else setUserId(data.session.user.id);
    });
    return () => subscription.unsubscribe();
  }, [nav]);

  // Games + members
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: ms } = await supabase.from("game_members").select("*").eq("user_id", userId);
      const list = (ms ?? []) as Member[];
      setMembers(list);
      if (list.length) {
        const { data: gs } = await supabase.from("games").select("*").in("id", list.map((m) => m.game_id));
        const gList = (gs ?? []) as Game[];
        setGames(gList);
        const saved = localStorage.getItem("activeSimGame");
        const pick = (saved && gList.find((g) => g.id === saved)?.id) || gList[0]?.id || null;
        setActiveGameId(pick);
      }
    })();
  }, [userId]);

  useEffect(() => { if (activeGameId) localStorage.setItem("activeSimGame", activeGameId); }, [activeGameId]);

  const activeMember = members.find((m) => m.game_id === activeGameId) || null;
  const activeGame = games.find((g) => g.id === activeGameId) || null;
  const allowShort = !!activeGame?.allow_short;

  // Position for this symbol
  useEffect(() => {
    if (!activeMember) { setPosition(null); return; }
    let alive = true;
    supabase.from("positions").select("*").eq("member_id", activeMember.id).eq("symbol", symbol).maybeSingle()
      .then(({ data }) => { if (alive) setPosition((data as Position) ?? null); });
    return () => { alive = false; };
  }, [activeMember?.id, symbol]);

  // Live quote
  useEffect(() => {
    let alive = true;
    const load = () => fetchQuotes([symbol]).then((qs) => { if (alive) setQuote(qs[0] ?? null); }).catch(() => {});
    load();
    const t = setInterval(load, 8000);
    return () => { alive = false; clearInterval(t); };
  }, [symbol]);

  const last: number | undefined = quote?.regularMarketPrice;
  const cash = Number(activeMember?.cash ?? 0);
  const curShares = Number(position?.shares ?? 0); // negative if short
  const isLong = curShares > 0;
  const isShort = curShares < 0;

  // Auto-pick a side that makes sense
  useEffect(() => {
    if (isLong && (side === "short" || side === "cover")) setSide("buy");
    if (isShort && (side === "buy" || side === "sell")) setSide("cover");
  }, [isLong, isShort]); // eslint-disable-line

  const maxShares = useMemo(() => {
    if (!last || last <= 0) return 1000;
    if (side === "buy") return Math.max(1, Math.floor(cash / last));
    if (side === "sell") return Math.max(1, isLong ? curShares : 0);
    if (side === "cover") return Math.max(1, isShort ? Math.abs(curShares) : 0);
    if (side === "short") return Math.max(1, Math.floor(cash / last)); // sim: 1x margin
    return 1;
  }, [side, last, cash, curShares, isLong, isShort]);

  useEffect(() => { if (shares > maxShares) setShares(Math.max(1, maxShares)); }, [maxShares]); // eslint-disable-line

  const estCost = last ? last * shares : 0;
  const cashAfter = side === "buy" || side === "cover" ? cash - estCost : cash + estCost;

  const place = async () => {
    if (!activeMember) return toast({ title: "Join a sim game first", variant: "destructive" });
    if ((side === "short" || side === "cover") && !allowShort)
      return toast({ title: "Shorting is disabled in this game", description: "Create a new game with shorts enabled.", variant: "destructive" });
    setPlacing(true);
    const { data, error } = await supabase.functions.invoke("place-order", {
      body: {
        member_id: activeMember.id, symbol, side, shares: Number(shares),
        order_type: orderType,
        limit_price: orderType === "limit" ? Number(limitPrice) : null,
        stop_price: orderType === "stop" ? Number(stopPrice) : null,
      },
    });
    setPlacing(false);
    if (error) return toast({ title: "Order failed", description: error.message, variant: "destructive" });
    if ((data as any)?.error) return toast({ title: "Order failed", description: (data as any).error, variant: "destructive" });
    toast({
      title: (data as any)?.queued ? "Order queued" : `Filled @ $${formatNumber((data as any)?.price)}`,
      description: `${side.toUpperCase()} ${shares} ${symbol}`,
    });
    // refresh portfolio bits
    if (activeMember) {
      const [{ data: m }, { data: p }] = await Promise.all([
        supabase.from("game_members").select("*").eq("id", activeMember.id).maybeSingle(),
        supabase.from("positions").select("*").eq("member_id", activeMember.id).eq("symbol", symbol).maybeSingle(),
      ]);
      if (m) setMembers((prev) => prev.map((x) => x.id === activeMember.id ? (m as Member) : x));
      setPosition((p as Position) ?? null);
    }
  };

  const sideMeta: Record<Side, { label: string; cls: string; disabled?: boolean; help: string }> = {
    buy:   { label: "Buy",   cls: "bg-up text-white",   help: "Open / add to a long position." , disabled: isShort },
    sell:  { label: "Sell",  cls: "bg-down text-white", help: "Close part of your long.", disabled: !isLong },
    short: { label: "Short", cls: "bg-down/90 text-white", help: "Bet the price falls. Cash credited now; you owe shares.", disabled: !allowShort || isLong },
    cover: { label: "Cover", cls: "bg-up/90 text-white",   help: "Buy back shares to close your short.", disabled: !isShort },
  };

  const ch = Number(quote?.regularMarketChangePercent ?? 0);

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`Trade ${symbol} — Integral Stocks`} description={`Paper-trade ${symbol} with market, limit, stop, short, and cover orders.`} path={`/sim/trade/${symbol}`} />
      <Header onSearch={(s) => nav(`/sim/trade/${s.toUpperCase()}`)} />

      <div className="border-b bg-gradient-to-r from-card via-card to-muted/30">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <button onClick={() => nav("/sim")} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Simulator
          </button>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-2xl font-extrabold tracking-tight">{symbol}</h1>
          {quote?.shortName && <span className="text-sm text-muted-foreground truncate max-w-[240px]">{quote.shortName}</span>}
          <div className="ml-auto flex items-center gap-3">
            {last != null && (
              <>
                <div className="text-2xl font-bold tabular-nums">${formatNumber(last)}</div>
                <div className={cn("text-sm font-semibold tabular-nums", ch >= 0 ? "text-up" : "text-down")}>
                  {ch >= 0 ? "+" : ""}{formatNumber(ch)}%
                </div>
              </>
            )}
            {games.length > 1 && (
              <select value={activeGameId ?? ""} onChange={(e) => setActiveGameId(e.target.value)}
                className="bg-muted border border-border/50 px-2.5 py-1 rounded-md text-sm">
                {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 grid lg:grid-cols-[1fr_420px] gap-6">
        <section className="space-y-4 order-2 lg:order-1">
          <Link to="/sim" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to portfolio
          </Link>
          <div className="bg-card border rounded-xl p-3 shadow-sm">
            <StockChart symbol={symbol} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Mini label="Day range" value={quote ? `${formatNumber(quote.regularMarketDayLow)} – ${formatNumber(quote.regularMarketDayHigh)}` : "—"} />
            <Mini label="52w range" value={quote ? `${formatNumber(quote.fiftyTwoWeekLow)} – ${formatNumber(quote.fiftyTwoWeekHigh)}` : "—"} />
            <Mini label="Mkt cap" value={quote?.marketCap ? `$${formatLargeNumber(quote.marketCap)}` : "—"} />
            <Mini label="Volume" value={quote?.regularMarketVolume ? formatLargeNumber(quote.regularMarketVolume) : "—"} />
          </div>
          <div className="bg-card border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2 font-semibold"><Shield className="w-4 h-4 text-primary" /> Your position in {symbol}</div>
            {curShares === 0 ? (
              <p className="text-sm text-muted-foreground">No position. Open a long with <b>Buy</b>{allowShort ? <> or bet against it with <b>Short</b></> : null}.</p>
            ) : (
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><div className="text-[10px] uppercase text-muted-foreground">Shares</div><div className={cn("font-bold tabular-nums", isShort ? "text-down" : "text-up")}>{curShares}</div></div>
                <div><div className="text-[10px] uppercase text-muted-foreground">Avg cost</div><div className="font-bold tabular-nums">${formatNumber(Number(position?.avg_cost))}</div></div>
                <div><div className="text-[10px] uppercase text-muted-foreground">Mark value</div><div className="font-bold tabular-nums">${formatNumber((last ?? Number(position?.avg_cost ?? 0)) * curShares)}</div></div>
              </div>
            )}
          </div>
        </section>

        <aside className="bg-card border rounded-xl p-5 shadow-md h-fit lg:sticky lg:top-4 space-y-4 order-1 lg:order-2">
          {!activeMember ? (
            <div className="text-sm text-muted-foreground">
              Join or create a sim game first. <button onClick={() => nav("/sim")} className="text-primary underline">Go to Simulator →</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-1 bg-muted rounded-lg p-1">
                {(Object.keys(sideMeta) as Side[]).map((s) => (
                  <button key={s} type="button" disabled={sideMeta[s].disabled}
                    onClick={() => setSide(s)}
                    className={cn(
                      "py-2 rounded-md text-xs font-bold uppercase tracking-wide transition",
                      side === s ? sideMeta[s].cls + " shadow" : "text-muted-foreground hover:bg-background/60",
                      sideMeta[s].disabled && "opacity-30 cursor-not-allowed"
                    )}
                    title={sideMeta[s].disabled ? "Not available right now" : sideMeta[s].help}>
                    {sideMeta[s].label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground -mt-2">{sideMeta[side].help}</p>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Shares</span>
                  <div className="flex items-center gap-1.5">
                    <input type="number" min={1} max={maxShares} value={shares}
                      onChange={(e) => setShares(Math.max(1, Math.min(maxShares, Number(e.target.value) || 1)))}
                      className="w-24 px-2 py-1 bg-muted rounded text-right tabular-nums text-sm font-bold outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
                <Slider value={[Math.min(shares, maxShares)]} min={1} max={Math.max(1, maxShares)} step={1}
                  onValueChange={(v) => setShares(v[0])} className="my-3" />
                <div className="grid grid-cols-4 gap-1">
                  {[0.25, 0.5, 0.75, 1].map((f) => (
                    <button key={f} type="button" onClick={() => setShares(Math.max(1, Math.floor(maxShares * f)))}
                      className="py-1 text-[11px] rounded bg-muted hover:bg-accent font-bold uppercase">
                      {f === 1 ? "Max" : `${f * 100}%`}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground tabular-nums">
                  <span>1</span><span>Max {maxShares.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-1 bg-muted rounded-lg p-1">
                {(["market", "limit", "stop"] as OrderType[]).map((t) => (
                  <button key={t} type="button" onClick={() => setOrderType(t)}
                    className={cn("flex-1 py-1.5 rounded text-xs font-bold uppercase",
                      orderType === t ? "bg-background shadow" : "text-muted-foreground")}>
                    {t}
                  </button>
                ))}
              </div>
              {orderType === "limit" && (
                <input type="number" step="0.01" value={limitPrice} onChange={(e) => setLimitPrice(Number(e.target.value))}
                  placeholder={`Limit price (last $${last ? formatNumber(last) : "—"})`}
                  className="w-full px-3 py-2 bg-muted rounded outline-none text-sm" />
              )}
              {orderType === "stop" && (
                <input type="number" step="0.01" value={stopPrice} onChange={(e) => setStopPrice(Number(e.target.value))}
                  placeholder={`Stop price (last $${last ? formatNumber(last) : "—"})`}
                  className="w-full px-3 py-2 bg-muted rounded outline-none text-sm" />
              )}

              <div className="rounded-lg bg-muted/40 border p-3 space-y-1.5 text-xs">
                <Row label="Est. price" value={last ? `$${formatNumber(last)}` : "—"} />
                <Row label="Shares" value={shares.toString()} />
                <Row label={side === "buy" || side === "cover" ? "Est. cost" : "Est. proceeds"} value={`$${formatNumber(estCost)}`} bold />
                <Row label="Cash before" value={`$${formatNumber(cash)}`} muted />
                <Row label="Cash after" value={`$${formatNumber(cashAfter)}`} bold cls={cashAfter < 0 ? "text-down" : ""} />
              </div>

              <button onClick={place} disabled={placing || maxShares < 1}
                className={cn(
                  "w-full py-3 rounded-xl font-extrabold text-white shadow-md hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2",
                  side === "buy" || side === "cover" ? "bg-up hover:brightness-110" : "bg-down hover:brightness-110"
                )}>
                {side === "buy" && <TrendingUp className="w-4 h-4" />}
                {side === "sell" && <TrendingDown className="w-4 h-4" />}
                {side === "short" && <TrendingDown className="w-4 h-4" />}
                {side === "cover" && <Zap className="w-4 h-4" />}
                {placing ? "Placing…" : `${sideMeta[side].label} ${shares} ${symbol}`}
              </button>
            </>
          )}
        </aside>
      </main>
    </div>
  );
};

const Mini = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-card border rounded-lg p-3">
    <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">{label}</div>
    <div className="text-sm font-semibold tabular-nums mt-1">{value}</div>
  </div>
);

const Row = ({ label, value, bold, muted, cls }: { label: string; value: string; bold?: boolean; muted?: boolean; cls?: string }) => (
  <div className="flex items-center justify-between">
    <span className={cn("text-muted-foreground", muted && "opacity-70")}>{label}</span>
    <span className={cn("tabular-nums", bold && "font-bold", cls)}>{value}</span>
  </div>
);

export default Trade;
