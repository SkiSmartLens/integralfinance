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

/** Supabase appends type=recovery to the password-reset link it emails out. */
const isRecoveryUrl = () => {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return (query.get("type") ?? hash.get("type")) === "recovery";
};

const Auth = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState<"google" | "apple" | "email" | null>(null);
  const [joiningGame, setJoiningGame] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Arriving from a reset email: collect a new password instead of signing in.
  const [recovering, setRecovering] = useState(isRecoveryUrl);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const isRecovery = isRecoveryUrl();
    const fromUrl = safeNext(new URLSearchParams(window.location.search).get("next"));
    if (fromUrl?.startsWith("/sim/join/")) setJoiningGame(true);
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

    // Full-page OAuth redirect (live site): the broker returns tokens on the
    // URL. Consume them, store the session, then clean the address bar.
    const consumeTokensFromUrl = async () => {
      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const access_token = query.get("access_token") ?? hash.get("access_token");
      const refresh_token = query.get("refresh_token") ?? hash.get("refresh_token");
      const err = query.get("error_description") ?? query.get("error") ?? hash.get("error_description");
      if (err) {
        toast({ title: "Sign in failed", description: err, variant: "destructive" });
        window.history.replaceState({}, "", "/auth");
        return false;
      }
      if (!access_token || !refresh_token) return false;
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      window.history.replaceState({}, "", "/auth");
      if (error) {
        toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
        return false;
      }
      return true;
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((e, session) => {
      if (e === "PASSWORD_RECOVERY") { setRecovering(true); return; }
      // A recovery link signs the user in to authorize the password change, so
      // redirecting on that session would skip the "set a new password" form.
      if (isRecovery) return;
      if (session) go();
    });
    (async () => {
      if (await consumeTokensFromUrl()) return; // onAuthStateChange fires and redirects
      if (isRecovery) return;
      const { data } = await supabase.auth.getSession();
      if (data.session) go();
    })();
    return () => subscription.unsubscribe();
  }, [nav]);

  const signIn = async (provider: "google" | "apple") => {
    setLoading(provider);
    // Return to /auth (a public route) so the redirect lands here and we can
    // forward the user to the simulator instead of the homepage.
    const redirectTo = `${window.location.origin}/auth`;
    try {
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

  const fail = (description: string) =>
    toast({ title: "Something went wrong", description, variant: "destructive" });

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setLoading("email");
    try {
      if (mode === "signup") {
        if (password.length < 8) {
          fail("Use at least 8 characters for your password.");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            // The profiles trigger reads display_name here, otherwise it falls
            // back to the email's local part (so "will.w@…" becomes "will.w").
            ...(name.trim() ? { data: { display_name: name.trim() } } : {}),
          },
        });
        if (error) {
          fail(error.message);
          return;
        }
        // No session means the project requires email confirmation first.
        if (!data.session) {
          setNotice(`Check ${email.trim()} for a confirmation link to finish setting up your account.`);
        }
        return; // with a session, onAuthStateChange redirects
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        fail(
          error.message === "Invalid login credentials"
            ? "That email and password don't match an account. Check them, or create an account below."
            : error.message,
        );
      }
      // on success onAuthStateChange redirects
    } finally {
      setLoading(null);
    }
  };

  const forgotPassword = async () => {
    const target = email.trim();
    if (!target) {
      fail("Enter your email address first, then tap 'Forgot password'.");
      return;
    }
    setNotice(null);
    setLoading("email");
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setLoading(null);
    if (error) {
      fail(error.message);
      return;
    }
    setNotice(`If an account exists for ${target}, a password reset link is on its way.`);
  };

  const setNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      fail("Use at least 8 characters for your password.");
      return;
    }
    setLoading("email");
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(null);
    if (error) {
      fail(error.message);
      return;
    }
    toast({ title: "Password updated", description: "You're all set." });
    setRecovering(false);
    setPassword("");
    nav("/sim/lobby", { replace: true });
  };

  const busy = loading !== null;

  if (recovering) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Choose a new password — Integral Stocks" description="Set a new password for your Integral Stocks account." path="/auth" />
        <Header onSearch={() => {}} />
        <div className="container mx-auto px-4 py-12 max-w-md">
          <form onSubmit={setNewPassword} className="bg-card border rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-1">Choose a new password</h1>
            <p className="text-sm text-muted-foreground mb-6">At least 8 characters.</p>
            <input
              type="password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              autoComplete="new-password"
              placeholder="New password"
              required
              className="w-full rounded-md border bg-background px-3 py-2.5 text-sm mb-3"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save password"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Sign in — Integral Stocks"
        description="Sign in with Google, Apple, or an email and password to access the Integral Stocks trading simulator and your watchlist."
        path="/auth"
      />
      <Header onSearch={() => {}} />
      <div className="container mx-auto px-4 py-12 max-w-md">
        <div className="bg-card border rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-1">{joiningGame ? "Create your account to join" : "Sign in to play"}</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {joiningGame
              ? "One tap with Google or Apple — you'll be signed in and added to the game automatically."
              : "Use your Google or Apple account to trade a virtual portfolio with $100k."}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => signIn("google")}
              disabled={busy}
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
              disabled={busy}
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

          <div className="flex items-center gap-3 my-6">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground font-medium">or use email</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submitEmail} className="space-y-3">
            {mode === "signup" && (
              <input
                type="text"
                value={name}
                onChange={(ev) => setName(ev.target.value)}
                autoComplete="name"
                placeholder="Your name"
                className="w-full rounded-md border bg-background px-3 py-2.5 text-sm"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              required
              className="w-full rounded-md border bg-background px-3 py-2.5 text-sm"
            />
            <input
              type="password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder={mode === "signup" ? "Password (8+ characters)" : "Password"}
              required
              className="w-full rounded-md border bg-background px-3 py-2.5 text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading === "email"
                ? "Working…"
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          {notice && (
            <p className="text-sm bg-muted/60 border rounded-md p-3 mt-3 text-muted-foreground">{notice}</p>
          )}

          <div className="flex items-center justify-between gap-2 mt-4 text-xs">
            <button
              type="button"
              onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setNotice(null); }}
              className="font-semibold text-primary hover:underline"
            >
              {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
            {mode === "signin" && (
              <button
                type="button"
                onClick={forgotPassword}
                disabled={busy}
                className="text-muted-foreground hover:text-foreground disabled:opacity-60"
              >
                Forgot password?
              </button>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            Google and Apple are the quickest — one tap, nothing to remember.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
