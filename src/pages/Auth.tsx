import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/backend";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { toast } from "@/hooks/use-toast";

const Auth = () => {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) nav("/sim/lobby");
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) nav("/sim/lobby"); });
    return () => subscription.unsubscribe();
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: `${window.location.origin}/sim/lobby`,
          data: { display_name: name || email.split("@")[0] },
        },
      });
      if (error) toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      else {
        // Auto-confirm is on — sign the user in immediately so they land in the lobby.
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) toast({ title: "Sign in failed", description: signInErr.message, variant: "destructive" });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Sign in — Integral Stocks"
        description="Sign in to Integral Stocks to access the trading simulator and your personal watchlist."
        path="/auth"
      />
      <Header onSearch={() => {}} />
      <div className="container mx-auto px-4 py-12 max-w-md">
        <div className="bg-card border rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-1">{mode === "signin" ? "Sign in" : "Create account"}</h1>
          <p className="text-sm text-muted-foreground mb-6">Trade a virtual portfolio with $100k.</p>
          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Display name" className="w-full px-3 py-2 bg-muted rounded outline-none focus:ring-2 ring-primary" />
            )}
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email" className="w-full px-3 py-2 bg-muted rounded outline-none focus:ring-2 ring-primary" />
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password" className="w-full px-3 py-2 bg-muted rounded outline-none focus:ring-2 ring-primary" />
            <button disabled={loading} className="w-full py-2 rounded bg-primary text-primary-foreground font-semibold disabled:opacity-60">
              {loading ? "…" : mode === "signin" ? "Sign in" : "Sign up"}
            </button>
          </form>
          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-xs text-muted-foreground hover:text-foreground mt-4">
            {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
