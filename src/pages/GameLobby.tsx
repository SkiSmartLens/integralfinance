import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/backend";
import { Header } from "@/components/Header";
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

const GameLobby = () => {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [myMemberships, setMyMemberships] = useState<(Member & { game: Game })[]>([]);
  const [publicGames, setPublicGames] = useState<Game[]>([]);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) nav("/auth");
      else setUserId(data.session.user.id);
    });
  }, [nav]);

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
    setLoading(false);
  };

  useEffect(() => {
    if (userId) refresh(userId);
  }, [userId]);

  const enterGame = (gameId: string) => {
    setActiveGame(gameId);
    nav("/sim");
  };

  const joinPublic = async (game: Game) => {
    if (!userId) return;
    const { error } = await supabase
      .from("game_members")
      .insert({ game_id: game.id, user_id: userId, cash: game.starting_cash });
    if (error && !error.message.includes("duplicate")) {
      return toast({ title: "Couldn't join", description: error.message, variant: "destructive" });
    }
    enterGame(game.id);
  };

  const joinByCode = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setJoining(true);
    const { data, error } = await supabase.rpc("join_game_by_code", { _code: c });
    setJoining(false);
    if (error) return toast({ title: "Join failed", description: error.message, variant: "destructive" });
    const g = (data as any[])?.[0];
    if (!g) return toast({ title: "Game not found", description: "Double-check the code.", variant: "destructive" });
    enterGame(g.id);
  };

  const leaveGame = async (memberId: string) => {
    if (!confirm("Leave this game? Your positions and cash for this game will be discarded.")) return;
    await supabase.from("game_members").delete().eq("id", memberId);
    if (userId) refresh(userId);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title="Play — Choose or Create a Game | Integral Stocks" description="Play the stock simulator solo or with friends. Create a private game, share your join code, or browse public games." path="/sim/lobby" />
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-primary bg-accent px-3 py-1 rounded-full">
            <Trophy className="w-3.5 h-3.5" /> Simulator Lobby
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">How do you want to play?</h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Play solo to practice, or start a private game and invite friends with a join code.
          </p>
        </header>

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

        {/* Your games */}
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
                    {!m.game.is_public && (
                      <CopyCode code={m.game.join_code} />
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => enterGame(m.game_id)}
                      className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground font-extrabold text-sm"
                    >
                      Enter
                    </button>
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

export default GameLobby;
