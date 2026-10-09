import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/backend";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { Header } from "@/components/Header";
import { PracticeNav } from "@/components/PracticeNav";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { toast } from "@/hooks/use-toast";
import {
  Users,
  User,
  Plus,
  LogIn,
  Globe,
  Lock,
  Copy,
  Check,
  Share2,
  Trophy,
  Loader2,
  ArrowRight,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/yahoo";

interface Game {
  id: string;
  name: string;
  is_public: boolean;
  starting_cash: number;
  join_code: string;
  allow_short: boolean;
  leverage: number;
  duration_days: number | null;
  created_by: string;
  ends_at: string | null;
  min_price: number | null;
  max_position_pct: number | null;
}
interface Member {
  id: string;
  game_id: string;
  user_id: string;
  cash: number;
}

const setActiveGame = (id: string) => {
  try { localStorage.setItem("activeSimGame", id); } catch {}
};

// Always the real domain, never window.location.origin — invite links get
// shared with other people, so they must not point at whatever preview/editor
// origin the game creator happened to be viewing from.
const SITE = "https://integralstocks.com";
export const inviteLink = (code: string) => `${SITE}/sim/join/${code}`;

interface AdminPosition { symbol: string; shares: number; avgCost: number }
interface AdminPlayer { member_id: string; user_id: string; cash: number; name: string; positions: AdminPosition[] }
interface AdminGame extends Game {
  players: AdminPlayer[];
}

const GameLobby = () => {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [myMemberships, setMyMemberships] = useState<(Member & { game: Game })[]>([]);
  const [publicGames, setPublicGames] = useState<Game[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminGames, setAdminGames] = useState<AdminGame[]>([]);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);

  // Signed-out visitors (and search crawlers) see the lobby itself; sign-in is
  // asked for only when they create or join a game. Redirecting here sent
  // Googlebot to /auth, which robots.txt blocks, so /simulator never indexed.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setUserId(data.session.user.id);
      else {
        setSignedOut(true);
        setLoading(false);
      }
    });
  }, []);

  const refresh = async (uid: string) => {
    setLoading(true);
    const { data: mems } = await supabase
      .from("game_members")
      .select("id, game_id, user_id, cash, games:games(*)")
      .eq("user_id", uid);
    const memberships =
      (mems as any[])?.map((m) => ({ ...m, game: m.games as Game })).filter((m) => m.game) ?? [];
    setMyMemberships(memberships);

    const memberGameIds = new Set(memberships.map((m) => m.game_id));
    const { data: pubs } = await supabase
      .from("games")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(24);
    setPublicGames(((pubs ?? []) as Game[]).filter((g) => !memberGameIds.has(g.id)));

    // Admins can see every game and every player in it.
    const { data: roles } = await (supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin");
    const admin = ((roles ?? []) as any[]).length > 0;
    setIsAdmin(admin);
    if (admin) {
      const { data: allGames } = await supabase
        .from("games")
        .select("*")
        .order("created_at", { ascending: false });
      const { data: allMembers } = await supabase
        .from("game_members")
        .select("id, game_id, user_id, cash");
      const { data: profs } = await supabase.from("profiles").select("user_id, display_name");
      const { data: allPositions } = await supabase
        .from("positions")
        .select("member_id, symbol, shares, avg_cost");
      const nameBy = new Map(((profs ?? []) as any[]).map((p) => [p.user_id, p.display_name as string]));
      const posByMember = new Map<string, AdminPosition[]>();
      (allPositions ?? []).forEach((p) => {
        const list = posByMember.get(p.member_id) ?? [];
        list.push({ symbol: p.symbol, shares: Number(p.shares), avgCost: Number(p.avg_cost) });
        posByMember.set(p.member_id, list);
      });
      const byGame = new Map<string, AdminPlayer[]>();
      ((allMembers ?? []) as any[]).forEach((m) => {
        const list = byGame.get(m.game_id) ?? [];
        list.push({
          member_id: m.id,
          user_id: m.user_id,
          cash: Number(m.cash),
          name: nameBy.get(m.user_id) ?? "Player",
          positions: posByMember.get(m.id) ?? [],
        });
        byGame.set(m.game_id, list);
      });
      setAdminGames(
        ((allGames ?? []) as Game[]).map((g) => ({ ...g, players: byGame.get(g.id) ?? [] })),
      );
    } else {
      setAdminGames([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userId) refresh(userId);
  }, [userId]);

  // Live prices for every symbol any player holds, so the admin panel can show
  // each player's real current total (cash + live position value) next to
  // their stored cash — the fastest way to tell a genuine gain/loss apart from
  // a stale or corrupted cash balance.
  const adminSymbols = useMemo(() => {
    const s = new Set<string>();
    adminGames.forEach((g) => g.players.forEach((p) => p.positions.forEach((pos) => s.add(pos.symbol))));
    return [...s];
  }, [adminGames]);
  const { quotes: adminQuotes } = useLiveQuotes(adminSymbols, 15000);
  const adminPriceMap = useMemo(
    () => new Map(adminQuotes.map((q) => [q.symbol, q.regularMarketPrice ?? 0])),
    [adminQuotes],
  );


  const enterGame = (gameId: string) => {
    setActiveGame(gameId);
    nav("/sim");
  };

  // The admin "All games" list includes every game in the app, not just ones
  // the admin has actually joined — enterGame() alone just points /sim at a
  // game_id with no game_members row behind it, so Sim.tsx can't find it and
  // silently falls back to whichever game the admin really is a member of
  // (their first one). Join on demand first, same as joinPublic, so "Open
  // game" actually works for any game.
  const adminOpenGame = async (game: Game) => {
    if (!userId) return;
    const alreadyMember = myMemberships.some((m) => m.game_id === game.id);
    if (!alreadyMember) {
      const { error } = await supabase
        .from("game_members")
        .insert({ game_id: game.id, user_id: userId, cash: game.starting_cash });
      if (error && !error.message.includes("duplicate")) {
        return toast({ title: "Couldn't open game", description: error.message, variant: "destructive" });
      }
    }
    enterGame(game.id);
  };

  const joinPublic = async (game: Game) => {
    if (!userId) return nav("/auth");
    const { error } = await supabase
      .from("game_members")
      .insert({ game_id: game.id, user_id: userId, cash: game.starting_cash });
    if (error && !error.message.includes("duplicate")) {
      return toast({ title: "Couldn't join", description: error.message, variant: "destructive" });
    }
    enterGame(game.id);
  };

  // Admin-only: directly set a player's cash (e.g. to fix a corrupted
  // balance). game_members.cash has no client-writable RLS policy at all —
  // every write normally happens through the trading engine's service-role
  // calls — so this goes through a privileged edge function that checks the
  // caller is actually an admin before touching anyone's balance.
  const editPlayerCash = async (player: { member_id: string; name: string; cash: number }) => {
    const next = prompt(`Set ${player.name}'s cash to:`, String(player.cash));
    if (next == null) return;
    const amount = Number(next);
    if (!Number.isFinite(amount) || amount < 0) {
      return toast({ title: "Enter a valid, non-negative number", variant: "destructive" });
    }
    const { data, error } = await supabase.functions.invoke<{ error?: string }>("admin-set-cash", {
      body: { member_id: player.member_id, cash: amount },
    });
    if (error) return toast({ title: "Couldn't update cash", description: error.message, variant: "destructive" });
    if (data?.error) return toast({ title: "Couldn't update cash", description: data.error, variant: "destructive" });
    toast({ title: `${player.name}'s cash set to $${amount.toLocaleString()}` });
    if (userId) refresh(userId);
  };

  // Admin-only: wipe a player's positions/orders/transaction history and
  // reset cash to the game's starting amount — a full clean slate, for
  // cleaning up a corrupted account rather than just patching the number.
  const resetPlayer = async (player: { member_id: string; name: string }) => {
    if (!confirm(`Reset ${player.name} to a clean starting balance? This clears all their positions and trade history.`)) return;
    const { data, error } = await supabase.functions.invoke<{ error?: string }>("admin-set-cash", {
      body: { member_id: player.member_id, action: "reset" },
    });
    if (error) return toast({ title: "Couldn't reset player", description: error.message, variant: "destructive" });
    if (data?.error) return toast({ title: "Couldn't reset player", description: data.error, variant: "destructive" });
    toast({ title: `${player.name} reset to a clean starting balance` });
    if (userId) refresh(userId);
  };

  const joinByCode = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    if (!userId) return nav("/auth");
    setJoining(true);
    const { data, error } = await supabase.functions.invoke("join-game", { body: { code: c } });
    setJoining(false);
    if (error) return toast({ title: "Join failed", description: error.message, variant: "destructive" });
    if ((data as any)?.error) return toast({ title: "Join failed", description: (data as any).error, variant: "destructive" });
    const g = data as { id?: string } | null;
    if (!g?.id) return toast({ title: "Game not found", description: "Double-check the code.", variant: "destructive" });
    enterGame(g.id);
  };

  const leaveGame = async (memberId: string) => {
    if (!confirm("Leave this game? Your positions and cash for this game will be discarded.")) return;
    await supabase.from("game_members").delete().eq("id", memberId);
    if (userId) refresh(userId);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Free Stock Market Simulator for Beginners | IntegralStocks"
        description="Practice trading with $100,000 of virtual cash and real live prices. Play the stock market simulator solo or with friends — free, zero risk."
        path="/simulator"
        keywords="stock market simulator, virtual trading, paper trading game, practice trading, fantasy stock game, trading simulator for beginners"
      />
      <Header />
      <PracticeNav />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-primary bg-accent px-3 py-1 rounded-full">
            <Trophy className="w-3.5 h-3.5" /> Simulator Lobby
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Free stock market simulator</h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Practice with $100,000 of virtual cash and real live prices. Play solo, or start a private game and
            invite friends with a join code.
          </p>
        </header>

        {signedOut && (
          <section className="rounded-3xl border-2 border-primary/30 bg-accent/50 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h2 className="font-extrabold">Sign in to start playing</h2>
              <p className="text-sm text-muted-foreground mt-1">
                It's free. Your games, cash, and trades are saved to your account.
              </p>
            </div>
            <Link
              to="/auth"
              className="h-11 px-6 rounded-2xl bg-primary text-primary-foreground font-extrabold inline-flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" /> Sign in
            </Link>
          </section>
        )}

        {/* Your games — first thing you see */}
        {myMemberships.length > 0 && (
          <section>
            <h2 className="text-xl font-extrabold mb-4">Your games</h2>
            <ul className="grid md:grid-cols-2 gap-4">
              {myMemberships.map((m) => (
                <li key={m.id} className="rounded-2xl border-2 bg-card p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="font-extrabold truncate">{m.game.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                        {m.game.is_public ? (
                          <><Globe className="w-3 h-3" /> Public</>
                        ) : (
                          <><Lock className="w-3 h-3" /> Private</>
                        )}
                        <span>·</span>
                        <span className="tabular-nums">${formatNumber(Number(m.cash))} cash</span>
                      </div>
                    </div>
                    {!m.game.is_public && <CopyCode code={m.game.join_code} />}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => enterGame(m.game_id)}
                      className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground font-extrabold text-sm"
                    >
                      Enter
                    </button>
                    {!m.game.is_public && <InviteLinkButton code={m.game.join_code} gameName={m.game.name} />}
                    <button
                      onClick={() => leaveGame(m.id)}
                      className="h-10 px-3 rounded-xl border-2 text-muted-foreground hover:text-rose-600 hover:border-rose-300 text-sm font-bold"
                    >
                      Leave
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Admin: every game and every player */}
        {isAdmin && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-extrabold">All games (admin)</h2>
              <span className="text-xs text-muted-foreground">{adminGames.length} total</span>
            </div>
            <ul className="grid md:grid-cols-2 gap-4">
              {adminGames.map((g) => (
                <li key={g.id} className="rounded-2xl border-2 bg-card p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-extrabold truncate">{g.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {g.is_public ? "Public" : "Private"} · {g.players.length} player
                        {g.players.length === 1 ? "" : "s"} · ${formatNumber(Number(g.starting_cash))} start
                      </div>
                    </div>
                    <CopyCode code={g.join_code} />
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {g.players.map((p) => {
                      const holdingsValue = p.positions.reduce(
                        (s, pos) => s + (adminPriceMap.get(pos.symbol) ?? pos.avgCost) * pos.shares,
                        0,
                      );
                      const total = p.cash + holdingsValue;
                      return (
                        <li key={p.user_id} className="bg-muted/40 rounded-lg px-2.5 py-1.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-bold">{p.name}</span>
                            <span className="tabular-nums font-extrabold shrink-0">${formatNumber(total)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5 text-muted-foreground">
                            <span className="truncate">
                              {p.positions.length === 0
                                ? "No positions"
                                : p.positions.map((pos) => `${pos.symbol} ${pos.shares}sh`).join(", ")}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => editPlayerCash(p)}
                                className="tabular-nums hover:text-primary underline decoration-dotted underline-offset-2"
                                title={`Set ${p.name}'s cash`}
                              >
                                ${formatNumber(p.cash)} cash
                              </button>
                              <button
                                onClick={() => resetPlayer(p)}
                                className="hover:text-rose-600 underline decoration-dotted underline-offset-2"
                                title={`Reset ${p.name} to a clean starting balance`}
                              >
                                Reset
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                    {g.players.length === 0 && (
                      <li className="text-xs text-muted-foreground">No players yet.</li>
                    )}
                  </ul>
                  <button
                    onClick={() => adminOpenGame(g)}
                    className="mt-4 w-full h-10 rounded-xl border-2 font-extrabold text-sm hover:border-primary"
                  >
                    Open game
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Create options */}
        <section className="grid md:grid-cols-2 gap-5">

          <Link
            to="/sim/create?mode=solo"
            className="group rounded-3xl border-2 bg-card p-7 hover:border-emerald-500 transition-all hover:-translate-y-0.5"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
              <User className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-extrabold">Play solo</h2>
            <p className="text-muted-foreground text-sm mt-1.5">
              Just you and $100k of virtual cash. Great for learning without pressure.
            </p>
            <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-extrabold text-emerald-700">
              Create private practice game <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            to="/sim/create?mode=friends"
            className="group rounded-3xl border-2 bg-card p-7 hover:border-primary transition-all hover:-translate-y-0.5"
          >
            <div className="w-12 h-12 rounded-2xl bg-accent text-primary flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-extrabold">Play with friends</h2>
            <p className="text-muted-foreground text-sm mt-1.5">
              Set the rules, get a join code, and see who tops the leaderboard.
            </p>
            <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-extrabold text-primary">
              Create game with friends <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </section>

        {/* Join by code */}
        <section className="rounded-3xl border-2 bg-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <LogIn className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-extrabold">Have a join code?</h2>
              <p className="text-xs text-muted-foreground">Enter it below to jump into a friend's game.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={12}
              className="flex-1 h-12 px-4 rounded-2xl bg-muted/60 border-2 border-transparent focus:border-primary/50 outline-none font-bold tracking-widest uppercase"
            />
            <button
              onClick={joinByCode}
              disabled={joining || !code.trim()}
              className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-extrabold disabled:opacity-50 inline-flex items-center gap-2"
            >
              {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              Join
            </button>
          </div>
        </section>


        {/* Public games */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-extrabold">Public games</h2>
            <span className="text-xs text-muted-foreground">{publicGames.length} open</span>
          </div>
          {loading ? (
            <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : publicGames.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
              No public games right now — be the first to start one!
            </div>
          ) : (
            <ul className="grid md:grid-cols-2 gap-4">
              {publicGames.map((g) => (
                <li key={g.id} className="rounded-2xl border-2 bg-card p-5 flex flex-col">
                  <div className="font-extrabold">{g.name}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 mt-1">
                    <span className="inline-flex items-center gap-1"><Wallet className="w-3 h-3" /> ${formatNumber(Number(g.starting_cash))}</span>
                    {g.allow_short && <span>· Shorting on</span>}
                    {Number(g.leverage) > 1 && <span>· {Number(g.leverage)}× leverage</span>}
                    {g.duration_days && <span>· {g.duration_days}-day</span>}
                    {g.min_price != null && <span>· Min ${Number(g.min_price)}/share</span>}
                    {g.max_position_pct != null && <span>· Max {Number(g.max_position_pct)}% per stock</span>}
                  </div>
                  <button
                    onClick={() => joinPublic(g)}
                    className="mt-4 h-10 rounded-xl bg-primary text-primary-foreground font-extrabold text-sm"
                  >
                    Join game
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
};

const CopyCode = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={cn(
        "shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold tracking-widest border-2",
        copied ? "border-emerald-500 text-emerald-700 bg-emerald-50" : "border-border hover:border-primary text-foreground",
      )}
      title="Copy join code"
    >
      <Copy className="w-3 h-3" /> {copied ? "Copied!" : code}
    </button>
  );
};

const InviteLinkButton = ({ code, gameName }: { code: string; gameName: string }) => {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = inviteLink(code);
    if (navigator.share) {
      try {
        await navigator.share({ title: `Join "${gameName}" on Integral Stocks`, url });
        return;
      } catch {
        // User cancelled the share sheet, or the browser doesn't support it
        // for this context — fall through to clipboard copy.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <button
      onClick={share}
      className={cn(
        "h-10 px-3 rounded-xl border-2 text-sm font-bold inline-flex items-center gap-1.5",
        copied ? "border-emerald-500 text-emerald-700 bg-emerald-50" : "hover:border-primary",
      )}
      title="Share an invite link — opens join page, signs them in, adds them to this game"
    >
      {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
      {copied ? "Copied!" : "Invite"}
    </button>
  );
};

export default GameLobby;
