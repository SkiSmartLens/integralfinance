import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/lib/backend";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Globe, Lock, TrendingDown, Zap, Clock, Wallet, ShieldAlert, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";

const DURATIONS = [
  { label: "Unlimited", days: null },
  { label: "1 week", days: 7 },
  { label: "1 month", days: 30 },
  { label: "3 months", days: 90 },
];

const LEVERAGES = [1, 2, 3, 5];
const CASH_OPTIONS = [10_000, 100_000, 1_000_000];
const MIN_PRICES = [
  { label: "None", value: null },
  { label: "$1", value: 1 },
  { label: "$5", value: 5 },
  { label: "$10", value: 10 },
];
const MAX_POSITIONS = [
  { label: "None", value: null },
  { label: "25%", value: 25 },
  { label: "50%", value: 50 },
  { label: "100%", value: 100 },
];

const CreateGame = () => {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const isFriends = sp.get("mode") === "friends";

  const [name, setName] = useState(isFriends ? "Friends League" : "My Practice Portfolio");
  const [isPublic, setIsPublic] = useState(false);
  const [startingCash, setStartingCash] = useState(100_000);
  const [customCash, setCustomCash] = useState(false);
  const [allowShort, setAllowShort] = useState(false);
  const [leverage, setLeverage] = useState(1);
  const [customLeverage, setCustomLeverage] = useState(false);
  const [durationDays, setDurationDays] = useState<number | null>(isFriends ? 30 : null);
  const [customDuration, setCustomDuration] = useState(false);
  const [commission, setCommission] = useState(0);
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [customMinPrice, setCustomMinPrice] = useState(false);
  const [maxPositionPct, setMaxPositionPct] = useState<number | null>(null);
  const [customMaxPosition, setCustomMaxPosition] = useState(false);
  const [saving, setSaving] = useState(false);

  const create = async () => {
    setSaving(true);
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) {
      setSaving(false);
      return nav("/auth");
    }
    const endsAt = durationDays
      ? new Date(Date.now() + durationDays * 86400_000).toISOString()
      : null;
    const { data: g, error } = await supabase
      .from("games")
      .insert({
        name: name.trim() || "My Game",
        starting_cash: startingCash,
        commission,
        allow_short: allowShort,
        leverage,
        duration_days: durationDays,
        ends_at: endsAt,
        is_public: isFriends ? isPublic : false,
        min_price: minPrice,
        max_position_pct: maxPositionPct,
        created_by: uid,
      } as any)
      .select()
      .single();
    if (error || !g) {
      setSaving(false);
      return toast({ title: "Couldn't create game", description: error?.message, variant: "destructive" });
    }
    await supabase
      .from("game_members")
      .insert({ game_id: g.id, user_id: uid, cash: startingCash });
    try { localStorage.setItem("activeSimGame", g.id); } catch {}
    setSaving(false);
    const isPrivateFriendsGame = isFriends && !(g as any).is_public;
    if (isPrivateFriendsGame) {
      const link = `${window.location.origin}/sim/join/${(g as any).join_code}`;
      try {
        await navigator.clipboard.writeText(link);
        toast({ title: "Game created! Invite link copied.", description: "Paste it to friends — opening it signs them in and adds them to this game." });
      } catch {
        toast({ title: "Game created!", description: `Share this link: ${link}` });
      }
    } else {
      toast({ title: "Game created!", description: "Have fun." });
    }
    nav("/sim");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title="Create Game — Integral Stocks Simulator" description="Configure your stock simulator game: starting cash, short selling, leverage, duration and visibility." path="/sim/create" />
      <Header />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        <Link to="/sim/lobby" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to lobby
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">
          {isFriends ? "New game with friends" : "New solo practice game"}
        </h1>
        <p className="text-muted-foreground mb-8">Choose the rules — you can always start another later.</p>

        <div className="space-y-6">
          {/* Name */}
          <Field label="Game name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              className="w-full h-12 px-4 rounded-2xl bg-muted/60 border-2 border-transparent focus:border-primary/50 outline-none font-bold"
            />
          </Field>

          {/* Visibility (friends only) */}
          {isFriends && (
            <Field label="Visibility">
              <div className="grid grid-cols-2 gap-2">
                <Toggle
                  active={!isPublic}
                  onClick={() => setIsPublic(false)}
                  icon={<Lock className="w-4 h-4" />}
                  title="Private"
                  desc="Invite by join code only"
                />
                <Toggle
                  active={isPublic}
                  onClick={() => setIsPublic(true)}
                  icon={<Globe className="w-4 h-4" />}
                  title="Public"
                  desc="Anyone can find & join"
                />
              </div>
            </Field>
          )}

          {/* Starting cash */}
          <Field label="Starting cash" icon={<Wallet className="w-4 h-4" />}>
            <div className="grid grid-cols-4 gap-2">
              {CASH_OPTIONS.map((c) => (
                <Toggle
                  key={c}
                  active={!customCash && startingCash === c}
                  onClick={() => { setCustomCash(false); setStartingCash(c); }}
                  title={`$${(c / 1000).toLocaleString()}k`}
                  desc={c === 100_000 ? "Standard" : c === 10_000 ? "Beginner" : "Whale mode"}
                />
              ))}
              <Toggle
                active={customCash}
                onClick={() => setCustomCash(true)}
                title="Custom"
                desc="Set your own"
              />
            </div>
            {customCash && (
              <div className="relative mt-2">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">$</span>
                <input
                  type="number"
                  min={1}
                  value={startingCash}
                  onChange={(e) => setStartingCash(Math.max(1, Number(e.target.value) || 0))}
                  placeholder="Enter starting cash"
                  className="w-full h-12 pl-8 pr-4 rounded-2xl bg-muted/60 border-2 border-transparent focus:border-primary/50 outline-none font-bold tabular-nums"
                />
              </div>
            )}
          </Field>

          {/* Duration */}
          <Field label="Game length" icon={<Clock className="w-4 h-4" />}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DURATIONS.map((d) => (
                <Toggle
                  key={d.label}
                  active={!customDuration && durationDays === d.days}
                  onClick={() => { setCustomDuration(false); setDurationDays(d.days); }}
                  title={d.label}
                />
              ))}
              <Toggle
                active={customDuration}
                onClick={() => { setCustomDuration(true); setDurationDays(durationDays ?? 14); }}
                title="Custom"
                desc="Set days"
              />
            </div>
            {customDuration && (
              <div className="relative mt-2">
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={durationDays ?? ""}
                  onChange={(e) => setDurationDays(Math.max(1, Number(e.target.value) || 0))}
                  placeholder="Number of days"
                  className="w-full h-12 pl-4 pr-14 rounded-2xl bg-muted/60 border-2 border-transparent focus:border-primary/50 outline-none font-bold tabular-nums"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">days</span>
              </div>
            )}
          </Field>

          {/* Leverage */}
          <Field label="Leverage" icon={<Zap className="w-4 h-4" />}>
            <div className="grid grid-cols-5 gap-2">
              {LEVERAGES.map((l) => (
                <Toggle
                  key={l}
                  active={!customLeverage && leverage === l}
                  onClick={() => { setCustomLeverage(false); setLeverage(l); }}
                  title={`${l}×`}
                  desc={l === 1 ? "Safe" : l >= 3 ? "Spicy" : "Boosted"}
                />
              ))}
              <Toggle
                active={customLeverage}
                onClick={() => setCustomLeverage(true)}
                title="Custom"
              />
            </div>
            {customLeverage && (
              <div className="relative mt-2">
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={0.5}
                  value={leverage}
                  onChange={(e) => setLeverage(Math.max(1, Number(e.target.value) || 1))}
                  placeholder="Leverage multiplier"
                  className="w-full h-12 pl-4 pr-10 rounded-2xl bg-muted/60 border-2 border-transparent focus:border-primary/50 outline-none font-bold tabular-nums"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">×</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Leverage multiplies both wins and losses — beginners should keep this at 1×.
            </p>
          </Field>

          {/* Minimum stock price */}
          <Field label="Minimum stock price" icon={<ShieldAlert className="w-4 h-4" />}>
            <div className="grid grid-cols-5 gap-2">
              {MIN_PRICES.map((m) => (
                <Toggle
                  key={m.label}
                  active={!customMinPrice && minPrice === m.value}
                  onClick={() => { setCustomMinPrice(false); setMinPrice(m.value); }}
                  title={m.label}
                />
              ))}
              <Toggle
                active={customMinPrice}
                onClick={() => { setCustomMinPrice(true); setMinPrice(minPrice ?? 15); }}
                title="Custom"
              />
            </div>
            {customMinPrice && (
              <div className="relative mt-2">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">$</span>
                <input
                  type="number"
                  min={0}
                  value={minPrice ?? ""}
                  onChange={(e) => setMinPrice(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="Minimum price per share"
                  className="w-full h-12 pl-8 pr-4 rounded-2xl bg-muted/60 border-2 border-transparent focus:border-primary/50 outline-none font-bold tabular-nums"
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Blocks new buys and shorts below this price — classic anti-penny-stock rule. Doesn't stop selling out of a position.
            </p>
          </Field>

          {/* Max position size */}
          <Field label="Max position size" icon={<PieChart className="w-4 h-4" />}>
            <div className="grid grid-cols-5 gap-2">
              {MAX_POSITIONS.map((m) => (
                <Toggle
                  key={m.label}
                  active={!customMaxPosition && maxPositionPct === m.value}
                  onClick={() => { setCustomMaxPosition(false); setMaxPositionPct(m.value); }}
                  title={m.label}
                />
              ))}
              <Toggle
                active={customMaxPosition}
                onClick={() => { setCustomMaxPosition(true); setMaxPositionPct(maxPositionPct ?? 10); }}
                title="Custom"
              />
            </div>
            {customMaxPosition && (
              <div className="relative mt-2">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={maxPositionPct ?? ""}
                  onChange={(e) => setMaxPositionPct(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
                  placeholder="Max % of starting capital per stock"
                  className="w-full h-12 pl-4 pr-10 rounded-2xl bg-muted/60 border-2 border-transparent focus:border-primary/50 outline-none font-bold tabular-nums"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">%</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Caps how much of your starting capital can sit in one stock — forces diversification instead of going all-in.
            </p>
          </Field>

          {/* Shorting */}
          <Field label="Advanced features">
            <label className="flex items-start gap-3 p-4 rounded-2xl border-2 bg-card cursor-pointer hover:border-primary/40 transition-colors">
              <input
                type="checkbox"
                checked={allowShort}
                onChange={(e) => setAllowShort(e.target.checked)}
                className="mt-1 w-5 h-5 rounded accent-primary"
              />
              <div>
                <div className="font-extrabold flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" /> Enable short selling
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Bet against a stock — profit if the price drops. Risky, but educational.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-2xl border-2 bg-card cursor-pointer hover:border-primary/40 transition-colors mt-2">
              <input
                type="checkbox"
                checked={commission > 0}
                onChange={(e) => setCommission(e.target.checked ? 1 : 0)}
                className="mt-1 w-5 h-5 rounded accent-primary"
              />
              <div>
                <div className="font-extrabold">Realistic commissions ($1/trade)</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Simulates the fees some brokers charge per order.
                </p>
              </div>
            </label>
          </Field>

          <button
            onClick={create}
            disabled={saving}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-extrabold text-base disabled:opacity-60 inline-flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {saving ? "Creating game…" : "Create game & start trading"}
          </button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

const Field = ({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div>
    <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-2">
      {icon}
      {label}
    </div>
    {children}
  </div>
);

const Toggle = ({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  title: string;
  desc?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "text-left p-3 rounded-2xl border-2 transition-all",
      active
        ? "border-primary bg-primary/5"
        : "border-border bg-card hover:border-primary/40",
    )}
  >
    <div className="font-extrabold text-sm inline-flex items-center gap-1.5">
      {icon} {title}
    </div>
    {desc && <div className="text-[11px] text-muted-foreground mt-0.5">{desc}</div>}
  </button>
);

export default CreateGame;
