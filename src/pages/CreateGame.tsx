import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/lib/backend";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Globe, Lock, TrendingDown, Zap, Clock, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const DURATIONS = [
  { label: "Unlimited", days: null },
  { label: "1 week", days: 7 },
  { label: "1 month", days: 30 },
  { label: "3 months", days: 90 },
];

const LEVERAGES = [1, 2, 3, 5];
const CASH_OPTIONS = [10_000, 100_000, 1_000_000];

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
    toast({ title: "Game created!", description: isFriends && !(g as any).is_public ? `Share code: ${(g as any).join_code}` : "Have fun." });
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
            <div className="grid grid-cols-3 gap-2">
              {CASH_OPTIONS.map((c) => (
                <Toggle
                  key={c}
                  active={startingCash === c}
                  onClick={() => setStartingCash(c)}
                  title={`$${(c / 1000).toLocaleString()}k`}
                  desc={c === 100_000 ? "Standard" : c === 10_000 ? "Beginner" : "Whale mode"}
                />
              ))}
            </div>
          </Field>

          {/* Duration */}
          <Field label="Game length" icon={<Clock className="w-4 h-4" />}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DURATIONS.map((d) => (
                <Toggle
                  key={d.label}
                  active={durationDays === d.days}
                  onClick={() => setDurationDays(d.days)}
                  title={d.label}
                />
              ))}
            </div>
          </Field>

          {/* Leverage */}
          <Field label="Leverage" icon={<Zap className="w-4 h-4" />}>
            <div className="grid grid-cols-4 gap-2">
              {LEVERAGES.map((l) => (
                <Toggle
                  key={l}
                  active={leverage === l}
                  onClick={() => setLeverage(l)}
                  title={`${l}×`}
                  desc={l === 1 ? "Safe" : l >= 3 ? "Spicy" : "Boosted"}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Leverage multiplies both wins and losses — beginners should keep this at 1×.
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
