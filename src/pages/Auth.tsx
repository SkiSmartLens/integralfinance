import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/backend";
import { lovable } from "@/integrations/lovable/index";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { toast } from "@/hooks/use-toast";

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const AppleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.84-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

const NEXT_KEY = "postAuthRedirect";

const safeNext = (v: string | null) =>
  v && v.startsWith("/") && !v.startsWith("//") ? v : null;

const Auth = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);

  useEffect(() => {
    const fromUrl = safeNext(new URLSearchParams(window.location.search).get("next"));
    if (fromUrl) {
      try { localStorage.setItem(NEXT_KEY, fromUrl); } catch { /* ignore */ }
    }
    const go = () => {
      let dest = "/sim/lobby";
      try {
        const stored = safeNext(localStorage.getItem(NEXT_KEY));
        if (stored) dest = stored;
        localStorage.removeItem(NEXT_KEY);
      } catch { /* ignore */ }
      nav(dest, { replace: true });
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) go();
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) go(); });
    return () => subscription.unsubscribe();
  }, [nav]);

  const signIn = async (provider: "google" | "apple") => {
    setLoading(provider);
    // Return to /auth (a public route) so the redirect lands here and we can
    // forward the user to the simulator instead of the homepage.
    const redirectTo = `${window.location.origin}/auth`;
    try {
      // Primary: the backend's own OAuth redirect flow — works on every origin
      // (preview, published, custom domain).
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (!error) return;
      // Fallback: Lovable-hosted OAuth helper.
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: redirectTo });
      if (result.redirected) return;
      if (result.error) throw result.error;
    } catch (e) {
      toast({
        title: "Sign in failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
      setLoading(null);
    }
  };



  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Sign in — Integral Stocks"
        description="Sign in with Google or Apple to access the Integral Stocks trading simulator and your watchlist."
        path="/auth"
      />
      <Header onSearch={() => {}} />
      <div className="container mx-auto px-4 py-12 max-w-md">
        <div className="bg-card border rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-1">Sign in to play</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Use your Google or Apple account to trade a virtual portfolio with $100k.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => signIn("google")}
              disabled={loading !== null}
              className="w-full py-2.5 rounded-md border bg-background font-semibold text-sm hover:bg-muted transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading === "google" ? (
                "Connecting…"
              ) : (
                <>
                  <GoogleIcon className="w-4 h-4" />
                  Continue with Google
                </>
              )}
            </button>
            <button
              onClick={() => signIn("apple")}
              disabled={loading !== null}
              className="w-full py-2.5 rounded-md bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading === "apple" ? (
                "Connecting…"
              ) : (
                <>
                  <AppleIcon className="w-4 h-4 fill-current" />
                  Continue with Apple
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            Single sign-on only — we never store a password for your account.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
