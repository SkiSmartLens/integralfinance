import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/backend";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { Loader2, AlertTriangle } from "lucide-react";

const setActiveGame = (id: string) => {
  try { localStorage.setItem("activeSimGame", id); } catch {}
};

const JoinGame = () => {
  const { code } = useParams<{ code: string }>();
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const c = (code ?? "").trim().toUpperCase();
    if (!c) {
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
      if (!sess.session) {
        // Auth.tsx reads ?next= and returns here once sign-up/sign-in completes.
        nav(`/auth?next=${encodeURIComponent(`/sim/join/${c}`)}`, { replace: true });
        return;
      }
      const { data, error: fnError } = await supabase.functions.invoke("join-game", {
        body: { code: c },
      });
      if (cancelled) return;
      if (fnError) {
        setError(fnError.message || "Could not join game. Please try again.");
        return;
      }
      if ((data as any)?.error) {
        setError((data as any).error);
        return;
      }
      const g = data as { id?: string } | null;
      if (!g?.id) {
        setError("Game not found. Double-check the invite link.");
        return;
      }
      setActiveGame(g.id);
      nav("/sim", { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [code, nav]);

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
        {error ? (
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
        ) : (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <h1 className="text-xl font-extrabold mb-2">Joining game…</h1>
            <p className="text-sm text-muted-foreground">Signing you in and grabbing your seat.</p>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default JoinGame;
