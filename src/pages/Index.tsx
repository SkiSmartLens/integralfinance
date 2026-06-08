import { lazy, Suspense, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { StockChart } from "@/components/StockChart";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { Newspaper, GraduationCap, BookOpen, Rocket, ArrowRight } from "lucide-react";

const StockSummary = lazy(() =>
  import("@/components/StockSummary").then((m) => ({ default: m.StockSummary }))
);

const FEATURES = [
  {
    to: "/market-brief",
    icon: Newspaper,
    title: "Market Brief",
    desc: "Today's biggest stories and market movers, explained in plain English.",
  },
  {
    to: "/learn/basics",
    icon: GraduationCap,
    title: "Daily Lesson",
    desc: "One short, beginner-friendly lesson to grow your investing brain.",
  },
  {
    to: "/learn",
    icon: BookOpen,
    title: "Learn",
    desc: "Bite-size guides on stocks, charts, indicators and more.",
  },
  {
    to: "/sim",
    icon: Rocket,
    title: "Simulator",
    desc: "Practice trading with $100,000 of fake money — zero risk.",
    accent: true,
  },
];

const Index = () => {
  const navigate = useNavigate();
  const [symbol, setSymbol] = useState("^GSPC");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="IntegralStocks — Beginner Stock News, Lessons & Simulator"
        description="A simple, beginner-friendly hub: a daily market brief, a lesson of the day, easy learning guides, and a free paper-trading simulator."
        path="/stocks"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "IntegralStocks",
          description: "Beginner-friendly stock learning hub with a market brief, daily lessons, and a free simulator.",
          url: "https://integralstocks.com/stocks",
        }}
      />
      <h1 className="sr-only">IntegralStocks — Beginner stock news, lessons, and a free simulator</h1>
      <Header onSearch={(s) => navigate(`/stocks/${encodeURIComponent(s.toLowerCase())}`)} />

      <main className="flex-1 px-4 sm:px-6 py-8 sm:py-12 max-w-5xl mx-auto w-full space-y-10">
        {/* Intro */}
        <section className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Everything you need to start, in one place
          </h2>
          <p className="text-muted-foreground mt-3 text-lg">
            No jargon, no clutter. Just the four things that matter for beginners.
          </p>
        </section>

        {/* Four beginner features */}
        <section className="grid sm:grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <Link
              key={f.to}
              to={f.to}
              className={
                "group rounded-2xl border-2 p-6 transition-colors flex flex-col gap-3 " +
                (f.accent
                  ? "border-primary bg-primary/5 hover:bg-primary/10"
                  : "border-border bg-card hover:border-primary")
              }
            >
              <span
                className={
                  "inline-flex items-center justify-center w-11 h-11 rounded-xl " +
                  (f.accent ? "bg-primary text-primary-foreground" : "bg-accent text-primary")
                }
              >
                <f.icon className="w-5 h-5" />
              </span>
              <div>
                <div className="font-extrabold text-lg flex items-center gap-1.5">
                  {f.title}
                  <ArrowRight className="w-4 h-4 text-primary opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </div>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{f.desc}</p>
              </div>
            </Link>
          ))}
        </section>

        {/* One simple market snapshot */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Today's market</h2>
            <p className="text-muted-foreground text-sm mt-1">
              A quick look at the S&amp;P 500 — a basket of 500 big US companies, often used to gauge how the
              market is doing.
            </p>
          </div>
          <div className="grid lg:grid-cols-[minmax(0,360px)_1fr] gap-6 items-start">
            <Suspense fallback={<div className="h-32" />}>
              <StockSummary symbol={symbol} />
            </Suspense>
            <StockChart symbol={symbol} />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Index;
