import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/backend";
import { lovable } from "@/integrations/lovable/index";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { toast } from "@/hooks/use-toast";

const Auth = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) nav("/sim/lobby");
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) nav("/sim/lobby"); });
    return () => subscription.unsubscribe();
  }, [nav]);

  const signIn = async (provider: "google" | "apple") => {
    setLoading(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({ title: "Sign in failed", description: result.error.message, variant: "destructive" });
        setLoading(null);
        return;
      }
      if (result.redirected) return;
      nav("/sim/lobby");
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
              className="w-full py-2.5 rounded-md border bg-background font-semibold text-sm hover:bg-muted transition-colors disabled:opacity-60"
            >
              {loading === "google" ? "Connecting…" : "Continue with Google"}
            </button>
            <button
              onClick={() => signIn("apple")}
              disabled={loading !== null}
              className="w-full py-2.5 rounded-md bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading === "apple" ? "Connecting…" : "Continue with Apple"}
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
