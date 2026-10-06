import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/backend";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { Loader2, AlertTriangle, Users, ArrowRight } from "lucide-react";

const setActiveGame = (id: string) => {
  try { localStorage.setItem("activeSimGame", id); } catch {}
};

type Status = "checking" | "needs-auth" | "joining" | "error";

const JoinGame = () => {
  const { code } = useParams<{ code: string }>();
  const nav = useNavigate();
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const c = (code ?? "").trim().toUpperCase();

  useEffect(() => {
    if (!c) {
      setStatus("error");
      setError("This invite link is missing a join code.");
      return;
    }
    // StrictMode/HMR double-mounts effects; a join is not idempotent-free of
    // side effects worth doubling (two toasts, two redirects), so guard it.
    if (started.current) return;
    started.current = true;

    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!sess.session) {
        setStatus("needs-auth");
        return;
      }
      await join();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c]);

  const join = async () => {
    setStatus("joining");
    const { data, error: fnError } = await supabase.functions.invoke("join-game", {
      body: { code: c },
    });
    if (fnError) {
      setStatus("error");
      setError(fnError.message || "Could not join game. Please try again.");
      return;
    }
    if ((data as any)?.error) {
      setStatus("error");
      setError((data as any).error);
      return;
    }
    const g = data as { id?: string } | null;
    if (!g?.id) {
      setStatus("error");
      setError("Game not found. Double-check the invite link.");
      return;
    }
    setActiveGame(g.id);
    nav("/sim", { replace: true });
  };

  // Auth.tsx reads ?next= and returns here once sign-up/sign-in completes,
  // at which point the effect above re-runs, finds a session, and auto-joins.
  const goSignIn = () => nav(`/auth?next=${encodeURIComponent(`/sim/join/${c}`)}`);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Join game — Integral Stocks Simulator"
        description="Join a friend's stock market simulator game."
        path={`/sim/join/${code ?? ""}`}
        noindex
      />
      <Header />
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-20 text-center">
        {status === "error" ? (
          <>
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-4" />
            <h1 className="text-xl font-extrabold mb-2">Couldn't join</h1>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <Link
              to="/sim/lobby"
              className="inline-flex h-11 px-6 rounded-2xl bg-primary text-primary-foreground font-extrabold items-center justify-center"
            >
              Back to lobby
            </Link>
          </>
        ) : status === "needs-auth" ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-accent text-primary flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-extrabold mb-2">You're invited to play</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Create a free account (or sign in) to join this game — once you do, you're added
              automatically. No extra steps, nothing else to copy or paste.
            </p>
            <button
              onClick={goSignIn}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-extrabold inline-flex items-center justify-center gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <h1 className="text-xl font-extrabold mb-2">
              {status === "joining" ? "Joining game…" : "Checking your invite…"}
            </h1>
            <p className="text-sm text-muted-foreground">Grabbing your seat.</p>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default JoinGame;
