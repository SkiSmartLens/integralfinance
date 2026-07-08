import { Link } from "react-router-dom";
import { Rocket, GraduationCap, Star, ArrowRight } from "lucide-react";

/**
 * Above-the-fold trio: Simulator, Learning Path, Watchlist.
 * Every other surface on the home page is secondary to these three.
 */
export const PriorityTiles = () => (
  <section aria-label="Get started" className="grid gap-3 sm:grid-cols-3">
    <Link
      to="/simulator"
      className="group rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5 hover:border-primary transition-colors"
    >
      <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-primary bg-background/80 px-2 py-0.5 rounded-full mb-2">
        <Rocket className="w-3 h-3" /> Practice
      </span>
      <h2 className="text-lg font-extrabold leading-snug">Trading Simulator</h2>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
        $100k of virtual cash. Real prices, zero risk. Learn by doing.
      </p>
      <span className="inline-flex items-center gap-1 font-bold text-primary text-sm mt-3 group-hover:gap-2 transition-all">
        Open the sim <ArrowRight className="w-3.5 h-3.5" />
      </span>
    </Link>

    <Link
      to="/learn"
      className="group rounded-2xl border-2 border-accent bg-accent/40 p-5 hover:border-primary transition-colors"
    >
      <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-primary bg-background/80 px-2 py-0.5 rounded-full mb-2">
        <GraduationCap className="w-3 h-3" /> Learn
      </span>
      <h2 className="text-lg font-extrabold leading-snug">Your Learning Path</h2>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
        Bite-size lessons — basics, patterns, indicators. Under 8 min each.
      </p>
      <span className="inline-flex items-center gap-1 font-bold text-primary text-sm mt-3 group-hover:gap-2 transition-all">
        Start lesson 1 <ArrowRight className="w-3.5 h-3.5" />
      </span>
    </Link>

    <Link
      to="/watchlist"
      className="group rounded-2xl border-2 border-border bg-card p-5 hover:border-primary transition-colors"
    >
      <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-primary bg-background/80 px-2 py-0.5 rounded-full mb-2">
        <Star className="w-3 h-3" /> Track
      </span>
      <h2 className="text-lg font-extrabold leading-snug">My Watchlist</h2>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
        Star the stocks you're curious about. Saved on this device — no account needed.
      </p>
      <span className="inline-flex items-center gap-1 font-bold text-primary text-sm mt-3 group-hover:gap-2 transition-all">
        Open watchlist <ArrowRight className="w-3.5 h-3.5" />
      </span>
    </Link>
  </section>
);
