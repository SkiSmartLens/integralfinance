import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Rocket, ShieldCheck, Star } from "lucide-react";

export const HomeHero = () => (
  <section className="relative overflow-hidden rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-accent via-card to-background p-7 sm:p-10">
    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-primary bg-background/80 px-3 py-1 rounded-full mb-4">
      <Sparkles className="w-3.5 h-3.5" /> Built for teens · 100% free
    </span>
    <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] max-w-2xl">
      Build your investing brain before you turn 18
    </h2>
    <p className="text-lg sm:text-xl text-muted-foreground mt-4 max-w-xl">
      Practice with <span className="font-bold text-foreground">$100,000 of fake money</span> — no bank
      account, no brokerage, no risk. Just learn how the market actually works.
    </p>
    <div className="flex flex-col sm:flex-row gap-3 mt-7">
      <Link
        to="/start"
        className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-primary text-primary-foreground font-extrabold text-lg hover:opacity-90 transition-opacity"
      >
        Start here <ArrowRight className="w-5 h-5" />
      </Link>
      <Link
        to="/simulator"
        className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full border-2 border-primary text-primary font-extrabold text-lg hover:bg-accent transition-colors"
      >
        Try the simulator
      </Link>
    </div>
  </section>
);

export const SimulatorCallout = () => (
  <section className="rounded-3xl bg-foreground text-background p-7 sm:p-10 overflow-hidden">
    <div className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-background/70 mb-3">
      <Rocket className="w-4 h-4" /> Free paper trading
    </div>
    <h2 className="text-2xl sm:text-4xl font-extrabold leading-tight max-w-2xl">
      Trade Apple, Tesla & Bitcoin with $100K of fake cash 💸
    </h2>
    <p className="text-base sm:text-lg text-background/70 mt-3 max-w-xl">
      Make real trades on real prices — minus the real risk. Mess up, learn, repeat.
      It's the gym for your money brain.
    </p>
    <div className="flex flex-wrap items-center gap-4 mt-6">
      <Link
        to="/simulator"
        className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-primary text-primary-foreground font-extrabold text-lg hover:opacity-90 transition-opacity"
      >
        Play now — it's free <ArrowRight className="w-5 h-5" />
      </Link>
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-background/70">
        <ShieldCheck className="w-4 h-4" /> Zero real money. Ever.
      </span>
    </div>
  </section>
);

export const SocialProof = () => (
  <section className="grid sm:grid-cols-[auto_1fr] gap-6 items-center rounded-3xl border bg-card p-6 sm:p-8">
    <div className="text-center sm:text-left">
      <div className="text-4xl font-extrabold text-primary">12,000+</div>
      <div className="text-sm font-semibold text-muted-foreground">young investors learning</div>
    </div>
    <figure className="border-l-0 sm:border-l sm:pl-6">
      <div className="flex gap-0.5 mb-2 justify-center sm:justify-start text-primary">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-current" />
        ))}
      </div>
      <blockquote className="text-lg font-semibold leading-snug">
        "I had no clue what a stock was. Two weeks later I'm up 8% in the sim and
        actually get the news now."
      </blockquote>
      <figcaption className="text-sm text-muted-foreground mt-2">— Maya, 16</figcaption>
    </figure>
  </section>
);
