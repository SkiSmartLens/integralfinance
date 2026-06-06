import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { BookOpen, TrendingUp, Briefcase, Rocket, Clock, Search, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const TRACKS = [
  {
    id: "basics",
    path: "/learn/basics",
    icon: BookOpen,
    color: "text-green-500",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    level: "Beginner",
    levelColor: "text-green-400 bg-green-400/10",
    title: "Stock Market Basics",
    desc: "Start from zero — learn what stocks are and how markets work.",
    lessons: [
      { id: "what-is-stock", title: "What Is a Stock?", mins: 8 },
      { id: "how-market-works", title: "How the Stock Market Works", mins: 9 },
      { id: "bull-bear", title: "Bull vs. Bear Markets", mins: 7 },
      { id: "market-cap", title: "What Is Market Cap?", mins: 6 },
      { id: "dividends", title: "Understanding Dividends", mins: 8 },
      { id: "broker", title: "What Is a Broker?", mins: 5 },
      { id: "prices-move", title: "How Stock Prices Move", mins: 7 },
      { id: "index", title: "What Is an Index?", mins: 6 },
      { id: "trading-hours", title: "Trading Hours Explained", mins: 5 },
      { id: "first-trade", title: "How to Place Your First Trade", mins: 8 },
    ],
  },
  {
    id: "reading",
    path: "/learn/reading",
    icon: TrendingUp,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    level: "Beginner–Intermediate",
    levelColor: "text-yellow-400 bg-yellow-400/10",
    title: "Reading the Market",
    desc: "Understand charts, trends, and what moves stock prices.",
    lessons: [
      { id: "reading-charts", title: "Reading Stock Charts", mins: 10 },
      { id: "pe-ratio", title: "What Is the P/E Ratio?", mins: 9 },
      { id: "etfs", title: "Understanding ETFs", mins: 9 },
      { id: "volume", title: "What Is Volume?", mins: 7 },
      { id: "support-resistance", title: "Support and Resistance", mins: 8 },
      { id: "moving-averages", title: "Moving Averages Explained", mins: 9 },
      { id: "sentiment", title: "What Is Market Sentiment?", mins: 7 },
      { id: "earnings", title: "How to Read Earnings Reports", mins: 10 },
    ],
  },
  {
    id: "portfolio",
    path: "/learn/portfolio",
    icon: Briefcase,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    level: "Intermediate",
    levelColor: "text-blue-400 bg-blue-400/10",
    title: "Building a Portfolio",
    desc: "Diversify, balance risk, and build a strategy that lasts.",
    lessons: [
      { id: "diversification", title: "What Is Diversification?", mins: 8 },
      { id: "dca", title: "Dollar-Cost Averaging", mins: 7 },
      { id: "growth-value", title: "Growth vs. Value Investing", mins: 9 },
      { id: "asset-allocation", title: "What Is Asset Allocation?", mins: 8 },
      { id: "evaluate-stock", title: "How to Evaluate a Stock", mins: 10 },
      { id: "risk-tolerance", title: "Understanding Risk Tolerance", mins: 7 },
      { id: "rebalancing", title: "Rebalancing Your Portfolio", mins: 8 },
      { id: "tax-accounts", title: "Tax-Advantaged Accounts", mins: 9 },
      { id: "long-term", title: "Building a Long-Term Strategy", mins: 10 },
    ],
  },
  {
    id: "advanced",
    path: "/learn/advanced",
    icon: Rocket,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    level: "Advanced",
    levelColor: "text-purple-400 bg-purple-400/10",
    title: "Advanced Strategies",
    desc: "Options, ETFs, short selling, and pro-level investing tactics.",
    lessons: [
      { id: "options", title: "What Are Options?", mins: 12 },
      { id: "short-selling", title: "Short Selling Explained", mins: 10 },
      { id: "futures", title: "Understanding Futures", mins: 10 },
      { id: "etf-vs-mutual", title: "ETFs vs. Mutual Funds", mins: 9 },
      { id: "margin", title: "Margin Trading Explained", mins: 11 },
      { id: "technical", title: "Technical Analysis Basics", mins: 10 },
      { id: "fundamental", title: "Fundamental Analysis Deep Dive", mins: 12 },
      { id: "sectors", title: "Sector Investing", mins: 9 },
      { id: "dividend-strategy", title: "Dividend Investing Strategy", mins: 10 },
      { id: "hedge-funds", title: "How Hedge Funds Work", mins: 9 },
      { id: "income-statement", title: "Reading an Income Statement", mins: 11 },
      { id: "balance-sheet", title: "Reading a Balance Sheet", mins: 11 },
    ],
  },
];

const ALL_LESSONS = TRACKS.flatMap((t) =>
  t.lessons.map((l) => ({ ...l, trackTitle: t.title, trackPath: t.path, trackColor: t.color }))
);

export default function LearnHub() {
  const [activeTrack, setActiveTrack] = useState("all");
  const [search, setSearch] = useState("");

  const filtered =
    search.trim().length > 0
      ? ALL_LESSONS.filter(
          (l) =>
            l.title.toLowerCase().includes(search.toLowerCase()) ||
            l.trackTitle.toLowerCase().includes(search.toLowerCase())
        )
      : null;

  const visibleTracks =
    activeTrack === "all" ? TRACKS : TRACKS.filter((t) => t.id === activeTrack);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Learn Investing — Integral Stocks"
        description="Bite-sized investing lessons across 4 tracks: Stock Market Basics, Reading the Market, Building a Portfolio, and Advanced Strategies."
        path="/learn"
      />
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">← Home</Link>
          <span>/</span>
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" /> Learn
          </span>
        </div>

        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
            The Stock Market, Finally Explained Simply
          </h1>
          <p className="text-muted-foreground max-w-xl">
            Bite-sized lessons, interactive quizzes, and a step-by-step roadmap — no finance degree required.
          </p>
          <div className="flex gap-6 mt-4 text-sm font-bold">
            <span className="text-muted-foreground"><span className="text-foreground text-xl font-extrabold">39</span> Lessons</span>
            <span className="text-muted-foreground"><span className="text-foreground text-xl font-extrabold">4</span> Tracks</span>
            <span className="text-muted-foreground"><span className="text-foreground text-xl font-extrabold">~9</span> Min Avg</span>
          </div>
        </div>

        {/* Filter tabs + search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
            {[{ id: "all", label: "All Tracks" }, ...TRACKS.map((t) => ({ id: t.id, label: t.title }))].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTrack(tab.id); setSearch(""); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap border transition-colors",
                  activeTrack === tab.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setActiveTrack("all"); }}
              placeholder="Search lessons..."
              className="pl-9 pr-4 py-1.5 rounded-lg border bg-card text-sm outline-none focus:ring-1 focus:ring-primary w-full sm:w-52"
            />
          </div>
        </div>

        {/* Search results */}
        {filtered && (
          <div className="mb-8">
            <p className="text-sm text-muted-foreground mb-3">{filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{search}"</p>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filtered.map((l) => (
                <Link
                  key={l.id}
                  to={`${l.trackPath}?lesson=${l.id}`}
                  className="p-4 rounded-xl bg-card border hover:border-primary/60 transition-colors"
                >
                  <div className={cn("text-xs font-bold mb-1", l.trackColor)}>{l.trackTitle}</div>
                  <div className="font-bold text-sm mb-2">{l.title}</div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" /> {l.mins} min</span>
                    <span className="text-xs text-primary font-semibold flex items-center gap-0.5">Start <ChevronRight className="w-3 h-3" /></span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tracks */}
        {!filtered && visibleTracks.map((track) => {
          const Icon = track.icon;
          return (
            <div key={track.id} className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", track.bg)}>
                    <Icon className={cn("w-5 h-5", track.color)} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-extrabold text-lg">{track.title}</h2>
                      <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", track.levelColor)}>{track.level}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{track.desc}</p>
                  </div>
                </div>
                <Link
                  to={track.path}
                  className={cn(
                    "hidden sm:flex items-center gap-1 text-sm font-bold px-4 py-1.5 rounded-lg border transition-colors",
                    track.border,
                    track.color,
                    "hover:opacity-80"
                  )}
                >
                  Start Track <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {track.lessons.map((lesson, i) => (
                  <Link
                    key={lesson.id}
                    to={`${track.path}?lesson=${lesson.id}`}
                    className="group p-4 rounded-xl bg-card border hover:border-primary/50 transition-all hover:-translate-y-0.5"
                  >
                    <div className="text-xs text-muted-foreground font-semibold mb-1">Lesson {i + 1}</div>
                    <div className="font-bold text-sm mb-2 group-hover:text-primary transition-colors">{lesson.title}</div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" /> {lesson.mins} min
                      </span>
                      <span className="text-xs text-primary font-semibold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        Start <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              <Link
                to={track.path}
                className={cn(
                  "mt-3 flex sm:hidden items-center justify-center gap-1 text-sm font-bold px-4 py-2 rounded-lg border w-full transition-colors",
                  track.border, track.color, "hover:opacity-80"
                )}
              >
                Start Track <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          );
        })}
      </main>

      <SiteFooter />
    </div>
  );
}
