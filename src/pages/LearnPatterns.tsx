import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { cn } from "@/lib/utils";
import { Heart, Flame, Star, Check, X, ArrowRight, Trophy, RotateCcw, GraduationCap } from "lucide-react";

/* ----------------------------- Pattern library ---------------------------- */

type Bias = "bullish" | "bearish" | "neutral";

interface Pattern {
  id: string;
  name: string;
  bias: Bias;
  blurb: string;
  /** Normalized (0..1) polyline points for the schematic chart */
  points: [number, number][];
  /** Optional annotation lines (horizontal levels etc.) */
  levels?: number[];
}

// Curve helpers — kept hand-coded so each pattern is visually distinct.
const PATTERNS: Pattern[] = [
  {
    id: "head-shoulders",
    name: "Head & Shoulders",
    bias: "bearish",
    blurb:
      "Three peaks: a smaller peak (shoulder), a higher peak (head), then another shoulder. Breaking the neckline below signals a trend reversal lower.",
    points: [
      [0, 0.75], [0.08, 0.55], [0.15, 0.45], [0.22, 0.6],
      [0.3, 0.7], [0.38, 0.25], [0.46, 0.55], [0.54, 0.7],
      [0.62, 0.45], [0.7, 0.55], [0.78, 0.7], [0.86, 0.8],
      [0.95, 0.9],
    ],
    levels: [0.62],
  },
  {
    id: "inverse-head-shoulders",
    name: "Inverse Head & Shoulders",
    bias: "bullish",
    blurb:
      "Mirror of Head & Shoulders — three troughs with the middle one deepest. A break above the neckline is a classic bullish reversal.",
    points: [
      [0, 0.25], [0.08, 0.45], [0.15, 0.55], [0.22, 0.4],
      [0.3, 0.3], [0.38, 0.75], [0.46, 0.45], [0.54, 0.3],
      [0.62, 0.55], [0.7, 0.45], [0.78, 0.3], [0.86, 0.2],
      [0.95, 0.1],
    ],
    levels: [0.38],
  },
  {
    id: "double-top",
    name: "Double Top",
    bias: "bearish",
    blurb:
      "Price hits a high, pulls back, then re-tests the same high and fails. The 'M' shape often signals exhaustion at resistance.",
    points: [
      [0, 0.85], [0.12, 0.6], [0.22, 0.2], [0.32, 0.4],
      [0.42, 0.55], [0.55, 0.2], [0.65, 0.5], [0.78, 0.7],
      [0.9, 0.85], [1, 0.9],
    ],
    levels: [0.55],
  },
  {
    id: "double-bottom",
    name: "Double Bottom",
    bias: "bullish",
    blurb:
      "Two clear lows at the same level form a 'W'. Buyers defended that price twice — a break of the middle high confirms upside.",
    points: [
      [0, 0.15], [0.12, 0.4], [0.22, 0.8], [0.32, 0.6],
      [0.42, 0.45], [0.55, 0.8], [0.65, 0.5], [0.78, 0.3],
      [0.9, 0.15], [1, 0.1],
    ],
    levels: [0.45],
  },
  {
    id: "cup-handle",
    name: "Cup & Handle",
    bias: "bullish",
    blurb:
      "A rounded 'U' bottom (the cup) followed by a small downward drift (the handle). A breakout above the rim targets a continued uptrend.",
    points: [
      [0, 0.25], [0.08, 0.4], [0.16, 0.6], [0.24, 0.75],
      [0.32, 0.78], [0.4, 0.7], [0.48, 0.55], [0.56, 0.4],
      [0.64, 0.28], [0.72, 0.35], [0.78, 0.45], [0.85, 0.4],
      [0.92, 0.25], [1, 0.1],
    ],
    levels: [0.25],
  },
  {
    id: "bull-flag",
    name: "Bull Flag",
    bias: "bullish",
    blurb:
      "A sharp run-up (the pole) followed by a tight, slightly downward channel (the flag). A break upward continues the trend.",
    points: [
      [0, 0.9], [0.08, 0.75], [0.16, 0.6], [0.24, 0.45],
      [0.32, 0.3], [0.4, 0.18], [0.5, 0.28], [0.58, 0.22],
      [0.66, 0.32], [0.74, 0.26], [0.82, 0.36], [0.9, 0.18],
      [1, 0.05],
    ],
  },
  {
    id: "bear-flag",
    name: "Bear Flag",
    bias: "bearish",
    blurb:
      "A sharp drop (the pole) followed by a tight, slightly upward channel (the flag). A break down continues the downtrend.",
    points: [
      [0, 0.1], [0.08, 0.25], [0.16, 0.4], [0.24, 0.55],
      [0.32, 0.7], [0.4, 0.82], [0.5, 0.72], [0.58, 0.78],
      [0.66, 0.68], [0.74, 0.74], [0.82, 0.64], [0.9, 0.82],
      [1, 0.95],
    ],
  },
  {
    id: "ascending-triangle",
    name: "Ascending Triangle",
    bias: "bullish",
    blurb:
      "Flat resistance on top, rising lows below. Buyers keep stepping up — a breakout above the flat line usually runs.",
    points: [
      [0, 0.85], [0.1, 0.3], [0.2, 0.7], [0.3, 0.3],
      [0.4, 0.6], [0.5, 0.3], [0.6, 0.5], [0.7, 0.3],
      [0.8, 0.42], [0.9, 0.3], [1, 0.15],
    ],
    levels: [0.3],
  },
  {
    id: "descending-triangle",
    name: "Descending Triangle",
    bias: "bearish",
    blurb:
      "Flat support on the bottom, falling highs above. Sellers keep pressing — a break below the flat line often accelerates lower.",
    points: [
      [0, 0.15], [0.1, 0.7], [0.2, 0.3], [0.3, 0.7],
      [0.4, 0.4], [0.5, 0.7], [0.6, 0.5], [0.7, 0.7],
      [0.8, 0.58], [0.9, 0.7], [1, 0.85],
    ],
    levels: [0.7],
  },
  {
    id: "symmetrical-triangle",
    name: "Symmetrical Triangle",
    bias: "neutral",
    blurb:
      "Lower highs and higher lows squeeze price into a point. Direction is unclear until the breakout — trade the break, not the wedge.",
    points: [
      [0, 0.1], [0.1, 0.85], [0.2, 0.2], [0.3, 0.75],
      [0.4, 0.3], [0.5, 0.65], [0.6, 0.4], [0.7, 0.55],
      [0.8, 0.45], [0.9, 0.5], [1, 0.15],
    ],
  },
  {
    id: "rising-wedge",
    name: "Rising Wedge",
    bias: "bearish",
    blurb:
      "Higher highs and higher lows, but the slope flattens as momentum fades. Often resolves with a sharp break lower.",
    points: [
      [0, 0.85], [0.1, 0.6], [0.2, 0.75], [0.3, 0.5],
      [0.4, 0.65], [0.5, 0.42], [0.6, 0.55], [0.7, 0.36],
      [0.8, 0.48], [0.9, 0.32], [1, 0.7],
    ],
  },
  {
    id: "falling-wedge",
    name: "Falling Wedge",
    bias: "bullish",
    blurb:
      "Lower highs and lower lows, but the slope flattens — sellers are losing steam. A break above the upper line is the bullish trigger.",
    points: [
      [0, 0.15], [0.1, 0.4], [0.2, 0.25], [0.3, 0.5],
      [0.4, 0.35], [0.5, 0.58], [0.6, 0.45], [0.7, 0.64],
      [0.8, 0.52], [0.9, 0.68], [1, 0.3],
    ],
  },
  {
    id: "rounding-bottom",
    name: "Rounding Bottom",
    bias: "bullish",
    blurb:
      "A long, smooth 'saucer' shape as sellers exhaust and buyers slowly take over. Patient base-building — often precedes a sustained uptrend.",
    points: [
      [0, 0.2], [0.1, 0.4], [0.2, 0.6], [0.3, 0.78],
      [0.4, 0.85], [0.5, 0.85], [0.6, 0.78], [0.7, 0.62],
      [0.8, 0.45], [0.9, 0.28], [1, 0.1],
    ],
  },
  {
    id: "triple-top",
    name: "Triple Top",
    bias: "bearish",
    blurb:
      "Three failed pushes at the same resistance. Sellers defend it harder each time — a break of the support line confirms a reversal lower.",
    points: [
      [0, 0.85], [0.1, 0.5], [0.18, 0.2], [0.28, 0.45],
      [0.38, 0.55], [0.48, 0.2], [0.58, 0.5], [0.68, 0.55],
      [0.78, 0.2], [0.88, 0.55], [1, 0.85],
    ],
    levels: [0.55],
  },
  {
    id: "triple-bottom",
    name: "Triple Bottom",
    bias: "bullish",
    blurb:
      "Three failed pushes at the same support. Buyers defend it harder each time — a break of the resistance line confirms a reversal higher.",
    points: [
      [0, 0.15], [0.1, 0.5], [0.18, 0.8], [0.28, 0.55],
      [0.38, 0.45], [0.48, 0.8], [0.58, 0.5], [0.68, 0.45],
      [0.78, 0.8], [0.88, 0.45], [1, 0.15],
    ],
    levels: [0.45],
  },
  {
    id: "pennant",
    name: "Pennant",
    bias: "neutral",
    blurb:
      "A sharp move followed by a tiny symmetrical squeeze — like a flag, but with converging lines. Continuation in the direction of the pole is most common.",
    points: [
      [0, 0.9], [0.08, 0.7], [0.16, 0.5], [0.24, 0.3],
      [0.32, 0.2], [0.4, 0.45], [0.48, 0.3], [0.56, 0.42],
      [0.64, 0.33], [0.72, 0.4], [0.8, 0.36], [0.88, 0.38],
      [1, 0.1],
    ],
  },
];

/* ------------------------------- SVG chart -------------------------------- */

const PatternChart = ({
  pattern,
  size = 320,
  highlight,
}: {
  pattern: Pattern;
  size?: number;
  highlight?: "correct" | "wrong" | null;
}) => {
  const W = size;
  const H = Math.round(size * 0.6);
  const pad = 16;
  const xs = pattern.points.map(([x]) => pad + x * (W - pad * 2));
  const ys = pattern.points.map(([, y]) => pad + y * (H - pad * 2));
  const d = pattern.points
    .map(([x, y], i) => {
      const px = pad + x * (W - pad * 2);
      const py = pad + y * (H - pad * 2);
      return `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(" ");
  // Closed area path for the mountain fill (down to the baseline, back to start).
  const baseY = H - pad;
  const areaD = `${d} L${xs[xs.length - 1].toFixed(1)},${baseY.toFixed(1)} L${xs[0].toFixed(1)},${baseY.toFixed(1)} Z`;
  const last = pattern.points[pattern.points.length - 1];
  const lastY = pad + last[1] * (H - pad * 2);
  const trendUp = lastY < H / 2;
  const stroke =
    highlight === "correct"
      ? "hsl(var(--up))"
      : highlight === "wrong"
      ? "hsl(var(--down))"
      : trendUp
      ? "hsl(var(--up))"
      : "hsl(var(--down))";
  const gradId = `mtn-${pattern.id}-${highlight ?? "n"}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="auto"
      className="block"
      role="img"
      aria-label={`${pattern.name} chart pattern schematic`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {/* grid */}
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1={pad}
          x2={W - pad}
          y1={pad + g * (H - pad * 2)}
          y2={pad + g * (H - pad * 2)}
          stroke="hsl(var(--border))"
          strokeDasharray="2 4"
          strokeWidth={1}
        />
      ))}
      {/* annotation levels */}
      {pattern.levels?.map((lv, i) => (
        <line
          key={i}
          x1={pad}
          x2={W - pad}
          y1={pad + lv * (H - pad * 2)}
          y2={pad + lv * (H - pad * 2)}
          stroke="hsl(var(--primary))"
          strokeDasharray="4 4"
          strokeWidth={1.5}
          opacity={0.6}
        />
      ))}
      {/* mountain fill */}
      <path d={areaD} fill={`url(#${gradId})`} stroke="none" />
      {/* line on top */}
      <path d={d} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* --------------------------------- Quiz ----------------------------------- */

type QuizQ =
  | { kind: "name"; pattern: Pattern; choices: string[] }
  | { kind: "bias"; pattern: Pattern; choices: Bias[] };

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const buildQuiz = (): QuizQ[] => {
  const pool = shuffle(PATTERNS);
  return pool.slice(0, 6).map((p, i) => {
    if (i % 2 === 0) {
      const others = shuffle(PATTERNS.filter((x) => x.id !== p.id)).slice(0, 3).map((x) => x.name);
      return { kind: "name", pattern: p, choices: shuffle([p.name, ...others]) };
    }
    return { kind: "bias", pattern: p, choices: shuffle<Bias>(["bullish", "bearish", "neutral"]) };
  });
};

/* ------------------------------ Page state -------------------------------- */

type Mode = "menu" | "lesson" | "quiz" | "result";

const STORAGE_KEY = "learn:patterns:v1";
const loadStats = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as { xp: number; streak: number; lastDay: string; mastered: string[] };
  } catch {/* ignore */}
  return { xp: 0, streak: 0, lastDay: "", mastered: [] as string[] };
};
const saveStats = (s: ReturnType<typeof loadStats>) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {/* ignore */}
};

export default function LearnPatterns() {
  const [mode, setMode] = useState<Mode>("menu");
  const [lessonIdx, setLessonIdx] = useState(0);
  const [quiz, setQuiz] = useState<QuizQ[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [correctCount, setCorrectCount] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [stats, setStats] = useState(loadStats());

  useEffect(() => { saveStats(stats); }, [stats]);

  const currentLesson = PATTERNS[lessonIdx];
  const currentQ = quiz[qIdx];

  const startLessons = () => { setLessonIdx(0); setMode("lesson"); };
  const startQuiz = () => {
    setQuiz(buildQuiz());
    setQIdx(0);
    setHearts(3);
    setCorrectCount(0);
    setPicked(null);
    setMode("quiz");
  };

  const nextLesson = () => {
    if (lessonIdx + 1 >= PATTERNS.length) {
      setStats((s) => ({ ...s, mastered: Array.from(new Set([...s.mastered, ...PATTERNS.map((p) => p.id)])) }));
      startQuiz();
    } else {
      setLessonIdx((i) => i + 1);
    }
  };

  const answer = (choice: string) => {
    if (picked) return;
    setPicked(choice);
    const correct =
      currentQ.kind === "name"
        ? choice === currentQ.pattern.name
        : choice === currentQ.pattern.bias;
    if (correct) {
      setCorrectCount((c) => c + 1);
      setStats((s) => {
        const today = new Date().toDateString();
        const streak = s.lastDay === today ? s.streak : s.streak + 1;
        return { ...s, xp: s.xp + 10, streak, lastDay: today };
      });
    } else {
      setHearts((h) => Math.max(0, h - 1));
    }
    setTimeout(() => {
      setPicked(null);
      if (!correct && hearts - 1 <= 0) { setMode("result"); return; }
      if (qIdx + 1 >= quiz.length) { setMode("result"); return; }
      setQIdx((i) => i + 1);
    }, 900);
  };

  const progress = useMemo(() => {
    if (mode === "lesson") return ((lessonIdx + 1) / PATTERNS.length) * 100;
    if (mode === "quiz") return ((qIdx + (picked ? 1 : 0)) / quiz.length) * 100;
    return 0;
  }, [mode, lessonIdx, qIdx, picked, quiz.length]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Learn Stock Chart Patterns — Duolingo-style Lessons"
        description="Master 16 must-know stock chart patterns — head & shoulders, double tops, cup & handle, flags and triangles — with bite-sized lessons and quick quizzes."
        path="/learn/patterns"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "LearningResource",
          name: "Stock Chart Patterns",
          educationalLevel: "Beginner",
          learningResourceType: "Interactive lesson",
          teaches: PATTERNS.map((p) => p.name).join(", "),
        }}
      />
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-bold flex items-center gap-1.5"><GraduationCap className="w-4 h-4" /> Learn · Patterns</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-bold">
            <span className="flex items-center gap-1 text-orange-500"><Flame className="w-4 h-4 fill-orange-500" /> {stats.streak}</span>
            <span className="flex items-center gap-1 text-yellow-500"><Star className="w-4 h-4 fill-yellow-500" /> {stats.xp} XP</span>
            {mode === "quiz" && (
              <span className="flex items-center gap-0.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Heart
                    key={i}
                    className={cn("w-4 h-4", i < hearts ? "fill-red-500 text-red-500" : "text-muted-foreground/40")}
                  />
                ))}
              </span>
            )}
          </div>
        </div>

        {(mode === "lesson" || mode === "quiz") && (
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-gradient-to-r from-up to-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* ----------------------------- MENU ----------------------------- */}
        {mode === "menu" && (
          <>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Learn stock chart patterns
            </h1>
            <p className="text-muted-foreground mt-2 mb-6">
              Bite-sized, Duolingo-style lessons. Tap through 16 must-know patterns, then test yourself with a quick quiz.
            </p>

            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              <button
                onClick={startLessons}
                className="text-left p-5 rounded-2xl bg-card border-2 border-b-4 border-primary/60 hover:translate-y-[-2px] hover:border-primary transition-all"
              >
                <div className="text-xs uppercase tracking-wider text-primary font-bold mb-1">Start here</div>
                <div className="text-lg font-bold mb-1">Learn all 16 patterns</div>
                <div className="text-sm text-muted-foreground">~3 minutes · earn 90 XP</div>
              </button>
              <button
                onClick={startQuiz}
                className="text-left p-5 rounded-2xl bg-card border-2 border-b-4 hover:translate-y-[-2px] hover:border-foreground/40 transition-all"
              >
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">Practice</div>
                <div className="text-lg font-bold mb-1">Take a quiz</div>
                <div className="text-sm text-muted-foreground">6 questions · 3 hearts</div>
              </button>
            </div>

            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">All patterns</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {PATTERNS.map((p, i) => {
                const done = stats.mastered.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => { setLessonIdx(i); setMode("lesson"); }}
                    className="text-left p-3 rounded-xl bg-card border hover:border-primary/60 transition-colors flex gap-3"
                  >
                    <div className="w-24 shrink-0 bg-muted/40 rounded-lg p-1">
                      <PatternChart pattern={p} size={120} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <div className="font-bold truncate">{p.name}</div>
                        {done && <Check className="w-3.5 h-3.5 text-up shrink-0" />}
                      </div>
                      <BiasBadge bias={p.bias} />
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ---------------------------- LESSON ---------------------------- */}
        {mode === "lesson" && currentLesson && (
          <div className="bg-card border-2 border-b-4 rounded-2xl p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">
              Lesson {lessonIdx + 1} of {PATTERNS.length}
            </div>
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h2 className="text-2xl font-extrabold">{currentLesson.name}</h2>
              <BiasBadge bias={currentLesson.bias} />
            </div>
            <div className="bg-muted/30 rounded-xl p-3 mb-4">
              <PatternChart pattern={currentLesson} size={520} />
            </div>
            <p className="leading-relaxed mb-6">{currentLesson.blurb}</p>
            <div className="flex justify-between gap-2">
              <button
                onClick={() => setMode("menu")}
                className="px-4 py-2.5 rounded-xl border-2 border-b-4 font-bold text-sm hover:bg-muted"
              >
                Exit
              </button>
              <button
                onClick={nextLesson}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground border-2 border-b-4 border-primary font-bold text-sm flex items-center gap-1.5 hover:opacity-90"
              >
                {lessonIdx + 1 >= PATTERNS.length ? "Start quiz" : "Continue"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ----------------------------- QUIZ ----------------------------- */}
        {mode === "quiz" && currentQ && (
          <div className="bg-card border-2 border-b-4 rounded-2xl p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">
              Question {qIdx + 1} of {quiz.length}
            </div>
            <h2 className="text-xl font-extrabold mb-4">
              {currentQ.kind === "name"
                ? "Which pattern is this?"
                : "Is this pattern bullish, bearish, or neutral?"}
            </h2>
            <div className="bg-muted/30 rounded-xl p-3 mb-5">
              <PatternChart
                pattern={currentQ.pattern}
                size={520}
                highlight={
                  picked == null
                    ? null
                    : (currentQ.kind === "name" ? picked === currentQ.pattern.name : picked === currentQ.pattern.bias)
                    ? "correct"
                    : "wrong"
                }
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {currentQ.choices.map((c) => {
                const isCorrect =
                  currentQ.kind === "name" ? c === currentQ.pattern.name : c === currentQ.pattern.bias;
                const isPicked = picked === c;
                return (
                  <button
                    key={c}
                    onClick={() => answer(c)}
                    disabled={picked != null}
                    className={cn(
                      "p-3 rounded-xl border-2 border-b-4 font-bold text-sm text-left transition-colors capitalize",
                      picked == null && "hover:border-primary/60",
                      picked != null && isCorrect && "bg-up/15 border-up text-up",
                      picked != null && isPicked && !isCorrect && "bg-down/15 border-down text-down",
                      picked != null && !isPicked && !isCorrect && "opacity-50",
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      {picked != null && isCorrect && <Check className="w-4 h-4" />}
                      {picked != null && isPicked && !isCorrect && <X className="w-4 h-4" />}
                      {c}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------------------------- RESULT ---------------------------- */}
        {mode === "result" && (
          <div className="bg-card border-2 border-b-4 rounded-2xl p-8 text-center">
            <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-3" />
            <h2 className="text-2xl font-extrabold mb-1">
              {hearts > 0 ? "Lesson complete!" : "Out of hearts"}
            </h2>
            <p className="text-muted-foreground mb-5">
              You got <span className="font-bold text-foreground">{correctCount}</span> of{" "}
              <span className="font-bold text-foreground">{quiz.length}</span> correct ·{" "}
              <span className="text-yellow-500 font-bold">+{correctCount * 10} XP</span>
            </p>
            <div className="flex justify-center gap-2 flex-wrap">
              <button
                onClick={startQuiz}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground border-2 border-b-4 border-primary font-bold text-sm flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" /> Try again
              </button>
              <button
                onClick={() => setMode("menu")}
                className="px-5 py-2.5 rounded-xl border-2 border-b-4 font-bold text-sm"
              >
                Back to menu
              </button>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

const BiasBadge = ({ bias }: { bias: Bias }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
      bias === "bullish" && "bg-up/15 text-up",
      bias === "bearish" && "bg-down/15 text-down",
      bias === "neutral" && "bg-muted text-muted-foreground",
    )}
  >
    {bias}
  </span>
);
