import { lazy, Suspense, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { StockChart } from "@/components/StockChart";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { cn } from "@/lib/utils";
import {
  Newspaper,
  GraduationCap,
  BookOpen,
  Rocket,
  ArrowRight,
  ChevronDown,
  LineChart,
  Info,
} from "lucide-react";

const StockSummary = lazy(() =>
  import("@/components/StockSummary").then((m) => ({ default: m.StockSummary }))
);

const QUICK_LINKS = [
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

const Section = ({
  icon,
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-2 border-border rounded-2xl bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-5 text-left"
      >
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-accent text-primary shrink-0">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold text-lg leading-tight">{title}</span>
          {subtitle && <span className="block text-sm text-muted-foreground mt-0.5">{subtitle}</span>}
        </span>
        <ChevronDown
          className={cn("w-5 h-5 text-muted-foreground transition-transform shrink-0", open && "rotate-180")}
        />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </section>
  );
};

const Index = () => {
  const navigate = useNavigate();
  const symbol = "^GSPC";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="IntegralStocks — Beginner Stock Brief, Lessons & Simulator"
        description="A simple beginner dashboard: a daily market brief, the S&P 500 with AI signals, easy lessons, and a free paper-trading simulator."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "IntegralStocks",
          description: "Beginner-friendly stock dashboard with a market brief, AI signals, and a free simulator.",
          url: "https://integralstocks.com/",
        }}
      />
      <h1 className="sr-only">IntegralStocks — Beginner stock dashboard, lessons, and a free simulator</h1>
      <Header onSearch={(s) => navigate(`/stocks/${encodeURIComponent(s.toLowerCase())}`)} />

      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-10 max-w-5xl mx-auto w-full space-y-6">
        {/* Market Brief — top, most prominent */}
        <Link
          to="/market-brief"
          className="group block rounded-2xl border-2 border-primary bg-primary/5 p-6 hover:bg-primary/10 transition-colors"
        >
          <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary text-primary-foreground mb-3">
            <Newspaper className="w-5 h-5" />
          </span>
          <div className="font-extrabold text-xl flex items-center gap-1.5">
            Market Brief
            <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Today's biggest stories, the largest movers, and a lesson of the day — explained in plain English.
          </p>
        </Link>

        {/* Quick links */}
        <section className="grid sm:grid-cols-3 gap-4">
          {QUICK_LINKS.map((f) => (
            <Link
              key={f.to}
              to={f.to}
              className={cn(
                "group rounded-2xl border-2 p-5 transition-colors flex flex-col gap-2",
                f.accent
                  ? "border-primary bg-primary/5 hover:bg-primary/10"
                  : "border-border bg-card hover:border-primary"
              )}
            >
              <span
                className={cn(
                  "inline-flex items-center justify-center w-10 h-10 rounded-xl",
                  f.accent ? "bg-primary text-primary-foreground" : "bg-accent text-primary"
                )}
              >
                <f.icon className="w-5 h-5" />
              </span>
              <div className="font-extrabold flex items-center gap-1.5">
                {f.title}
                <ArrowRight className="w-4 h-4 text-primary opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </Link>
          ))}
        </section>

        {/* S&P 500 + AI signals — starts compressed */}
        <Section
          icon={<LineChart className="w-5 h-5" />}
          title="S&P 500 & AI signals"
          subtitle="A quick look at the market, with AI insights you can expand."
        >
          <div className="grid lg:grid-cols-[minmax(0,360px)_1fr] gap-6 items-start">
            <Suspense fallback={<div className="h-32" />}>
              <StockSummary symbol={symbol} />
            </Suspense>
            <StockChart symbol={symbol} />
          </div>
        </Section>

        {/* What is IntegralStocks — starts compressed */}
        <Section
          icon={<Info className="w-5 h-5" />}
          title="What is IntegralStocks?"
          subtitle="New here? Start with the basics."
        >
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              IntegralStocks is a beginner-friendly place to understand the stock market. We turn confusing
              market news into plain English, explain <span className="font-semibold text-foreground">why</span>{" "}
              stocks move with AI insights, and let you practice trading risk-free.
            </p>
            <p>
              Start with the <Link to="/market-brief" className="text-primary font-semibold underline-offset-2 hover:underline">Market Brief</Link>{" "}
              for today's news, read a{" "}
              <Link to="/learn/basics" className="text-primary font-semibold underline-offset-2 hover:underline">Daily Lesson</Link>, then
              try the{" "}
              <Link to="/sim" className="text-primary font-semibold underline-offset-2 hover:underline">Simulator</Link>{" "}
              with $100,000 of fake money.
            </p>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Index;
