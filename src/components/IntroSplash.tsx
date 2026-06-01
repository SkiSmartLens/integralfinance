import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp } from "lucide-react";

const STORAGE_KEY = "integral-intro-seen";

interface Props {
  onEnter: () => void;
}

/** Full-screen first-visit splash. Fades out into the homepage on Enter. */
export const IntroSplash = ({ onEnter }: Props) => {
  const [leaving, setLeaving] = useState(false);

  const enter = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setLeaving(true);
    setTimeout(onEnter, 600);
  };

  return (
    <div
      className={
        "fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background transition-opacity duration-500 " +
        (leaving ? "opacity-0 pointer-events-none" : "opacity-100")
      }
    >
      {/* Animated background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-accent via-background to-accent animate-soft-pulse" />
        <div className="absolute -top-20 -left-10 w-72 h-72 rounded-full bg-primary/20 blur-3xl animate-orb" />
        <div
          className="absolute top-1/3 right-0 w-96 h-96 rounded-full bg-primary/15 blur-3xl animate-orb"
          style={{ animationDelay: "-5s" }}
        />
        <div
          className="absolute bottom-0 left-1/4 w-80 h-80 rounded-full bg-primary/10 blur-3xl animate-orb"
          style={{ animationDelay: "-9s" }}
        />
      </div>

      <div className="text-center px-6 animate-fade-in">
        <div className="inline-flex items-center gap-2.5 mb-7">
          <TrendingUp className="w-9 h-9 text-primary" />
          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">Integral Stocks</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] max-w-2xl mx-auto">
          Build your investing brain before you turn 18
        </h1>
        <button
          onClick={enter}
          className="mt-10 inline-flex items-center justify-center gap-2 px-9 py-4 rounded-full bg-primary text-primary-foreground font-extrabold text-lg shadow-lg shadow-primary/30 hover:opacity-90 hover:scale-105 transition-all"
        >
          Enter Site <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export const hasSeenIntro = () => {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};
