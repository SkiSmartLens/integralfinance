import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { ACADEMY_MODULES, useAcademy } from "@/lib/academy";
import { CheckCircle2, Lock, GraduationCap, ArrowRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const Academy = () => {
  const { isCompleted, isUnlocked, complete, currentModule, allComplete } = useAcademy();
  const [openId, setOpenId] = useState<number>(currentModule.id);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Investor Academy — Learn Investing Step by Step"
        description="A short, linear course for total beginners. Unlock one lesson at a time and build real investing skills."
        path="/academy"
      />
      <Header />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14 space-y-10">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-primary text-xs font-extrabold uppercase tracking-wider">
            <GraduationCap className="w-3.5 h-3.5" /> Investor Academy
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Learn to invest, one small step at a time.
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Three short modules. Each one unlocks the next. Finish all three and you'll know more about stocks than most adults.
          </p>
        </header>

        <ol className="space-y-4">
          {ACADEMY_MODULES.map((m) => {
            const done = isCompleted(m.id);
            const unlocked = isUnlocked(m.id);
            const isOpen = openId === m.id && unlocked;
            return (
              <li
                key={m.id}
                className={cn(
                  "border-2 rounded-2xl bg-card overflow-hidden transition-colors",
                  done ? "border-primary/40" : unlocked ? "border-border" : "border-border/50 opacity-60"
                )}
              >
                <button
                  type="button"
                  disabled={!unlocked}
                  onClick={() => setOpenId((cur) => (cur === m.id ? -1 : m.id))}
                  className="w-full flex items-center gap-4 p-5 text-left disabled:cursor-not-allowed"
                >
                  <span className="shrink-0">
                    {done ? (
                      <CheckCircle2 className="w-7 h-7 text-primary" />
                    ) : unlocked ? (
                      <Circle className="w-7 h-7 text-muted-foreground" />
                    ) : (
                      <Lock className="w-7 h-7 text-muted-foreground" />
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Module {m.id} · {m.duration}
                    </span>
                    <span className="block font-extrabold text-lg leading-tight mt-0.5">{m.title}</span>
                    <span className="block text-sm text-muted-foreground mt-1">{m.blurb}</span>
                  </span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-6 space-y-5 border-t pt-5">
                    {m.content.map((c) => (
                      <div key={c.heading}>
                        <h3 className="font-extrabold text-base mb-1.5">{c.heading}</h3>
                        <p className="text-muted-foreground leading-relaxed">{c.body}</p>
                      </div>
                    ))}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      {!done && (
                        <button
                          onClick={() => {
                            complete(m.id);
                            const next = ACADEMY_MODULES.find((x) => x.id === m.id + 1);
                            if (next) setOpenId(next.id);
                          }}
                          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground font-extrabold hover:opacity-90 transition-opacity"
                        >
                          Mark complete <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      {m.id === 3 && (
                        <Link
                          to="/sim"
                          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border-2 border-primary text-primary font-extrabold hover:bg-accent transition-colors"
                        >
                          Open the Simulator <ArrowRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {allComplete && (
          <div className="rounded-2xl border-2 border-primary bg-primary/5 p-6 text-center">
            <div className="text-2xl font-extrabold">You finished the Academy 🎓</div>
            <p className="text-muted-foreground mt-2">
              Keep going with our <Link to="/learn" className="text-primary underline">deeper guides</Link>{" "}
              or practice more in the <Link to="/sim" className="text-primary underline">Simulator</Link>.
            </p>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default Academy;
