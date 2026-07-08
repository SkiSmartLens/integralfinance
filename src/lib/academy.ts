import { useCallback, useEffect, useState } from "react";

export interface AcademyModule {
  id: number;
  title: string;
  blurb: string;
  duration: string;
  content: { heading: string; body: string }[];
}

export const ACADEMY_MODULES: AcademyModule[] = [
  {
    id: 1,
    title: "What Is a Stock?",
    blurb: "Own a tiny slice of a real company — and why that matters.",
    duration: "3 min",
    content: [
      {
        heading: "A stock is a piece of a company",
        body: "When you buy one share of Apple, you own a microscopic slice of Apple — the buildings, the iPhones, the future profits. Companies sell shares to raise money; you buy shares hoping the company grows.",
      },
      {
        heading: "Why prices move",
        body: "If more people want to buy a stock than sell it, the price goes up. If people expect a company to make more money in the future, they'll pay more today. News, earnings, and mood all push prices around.",
      },
      {
        heading: "How you make money",
        body: "Two ways: the price goes up (you sell for more than you paid), or the company pays you a dividend — a small cash payment for owning shares.",
      },
    ],
  },
  {
    id: 2,
    title: "Reading Charts",
    blurb: "Green candles, red candles, and what the squiggly line really means.",
    duration: "4 min",
    content: [
      {
        heading: "The line chart",
        body: "The simplest chart just plots price over time. Left = past, right = now. Up = the stock got more expensive.",
      },
      {
        heading: "Candles in 20 seconds",
        body: "Each candle shows one day (or minute, or hour). Green = closed higher than it opened. Red = closed lower. The thin wicks show the highest and lowest price in that period.",
      },
      {
        heading: "Timeframes matter",
        body: "A stock can be down 2% today but up 40% this year. Zoom out before you panic. Long-term investors mostly ignore daily wiggles.",
      },
    ],
  },
  {
    id: 3,
    title: "Your First Practice Trade",
    blurb: "Buy a share (with fake money) and watch what happens.",
    duration: "5 min",
    content: [
      {
        heading: "Pick a company you know",
        body: "Apple, Nike, Netflix — start with a brand you actually use. You'll pay more attention to it, and you'll learn faster when the price moves.",
      },
      {
        heading: "Place the trade in the simulator",
        body: "Open the Simulator, search the ticker, choose how many shares, and hit Buy. No real money changes hands — you're playing with $100,000 in virtual cash.",
      },
      {
        heading: "Watch, don't react",
        body: "The price will bounce. That's normal. Check back tomorrow and next week. The goal isn't to make money fast — it's to learn how the market feels.",
      },
    ],
  },
];

const KEY = "academy.progress.v1";
const CHECKLIST_KEY = "onboarding.checklist.v1";

export interface AcademyProgress {
  completed: number[]; // module ids
}

function load(): AcademyProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { completed: [] };
    const p = JSON.parse(raw);
    return { completed: Array.isArray(p.completed) ? p.completed.filter((n: any) => typeof n === "number") : [] };
  } catch {
    return { completed: [] };
  }
}

export function useAcademy() {
  const [progress, setProgress] = useState<AcademyProgress>(() => load());

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setProgress(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const complete = useCallback((id: number) => {
    setProgress((p) => (p.completed.includes(id) ? p : { completed: [...p.completed, id] }));
  }, []);

  const reset = useCallback(() => setProgress({ completed: [] }), []);

  const isCompleted = (id: number) => progress.completed.includes(id);
  const isUnlocked = (id: number) => id === 1 || progress.completed.includes(id - 1);
  const currentModule =
    ACADEMY_MODULES.find((m) => !progress.completed.includes(m.id)) ?? ACADEMY_MODULES[ACADEMY_MODULES.length - 1];
  const allComplete = progress.completed.length >= ACADEMY_MODULES.length;

  return { progress, complete, reset, isCompleted, isUnlocked, currentModule, allComplete };
}

// ---------- First-time user checklist ----------

export interface Checklist {
  lesson1: boolean;
  addedStock: boolean;
  firstTrade: boolean;
  dismissed: boolean;
}

function loadChecklist(): Checklist {
  try {
    const raw = localStorage.getItem(CHECKLIST_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        lesson1: !!p.lesson1,
        addedStock: !!p.addedStock,
        firstTrade: !!p.firstTrade,
        dismissed: !!p.dismissed,
      };
    }
  } catch {}
  return { lesson1: false, addedStock: false, firstTrade: false, dismissed: false };
}

export function useChecklist() {
  const academy = useAcademy();
  const [state, setState] = useState<Checklist>(() => loadChecklist());

  // Auto-derive lesson1 from academy progress
  useEffect(() => {
    if (academy.isCompleted(1) && !state.lesson1) {
      setState((s) => ({ ...s, lesson1: true }));
    }
  }, [academy, state.lesson1]);

  // Derive addedStock from watchlist storage
  useEffect(() => {
    const check = () => {
      try {
        const raw = localStorage.getItem("watchlist.symbols.v1");
        const has = raw ? (JSON.parse(raw)?.length ?? 0) > 0 : false;
        setState((s) => (has && !s.addedStock ? { ...s, addedStock: true } : s));
      } catch {}
    };
    check();
    window.addEventListener("storage", check);
    const t = window.setInterval(check, 2000);
    return () => {
      window.removeEventListener("storage", check);
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(state));
  }, [state]);

  const markTrade = () => setState((s) => ({ ...s, firstTrade: true }));
  const dismiss = () => setState((s) => ({ ...s, dismissed: true }));

  const allDone = state.lesson1 && state.addedStock && state.firstTrade;
  const visible = !state.dismissed && !allDone;

  return { state, markTrade, dismiss, allDone, visible };
}
