import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { Search } from "lucide-react";
import { GLOSSARY, CATEGORY_LABEL, type GlossaryEntry } from "@/content/glossary";
import { cn } from "@/lib/utils";

const SITE = "https://integralstocks.com";
const CATEGORIES: GlossaryEntry["category"][] = ["basics", "trading", "indicators", "fundamentals"];

const GlossaryIndex = () => {
  const [tab, setTab] = useState<GlossaryEntry["category"] | "all">("all");
  const [search, setSearch] = useState("");

  const sorted = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));
  const q = search.trim().toLowerCase();
  const filtered = sorted.filter((g) => {
    if (tab !== "all" && g.category !== tab) return false;
    if (q && !g.term.toLowerCase().includes(q) && !g.short.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Stock Market Glossary — Investing Terms Explained | IntegralStocks"
        description="A plain-English glossary of stock market and investing terms — market cap, P/E ratio, RSI, MACD, dividends, and more — each explained in one clear page."
        path="/learn/glossary"
        keywords="stock market glossary, investing terms glossary, finance dictionary, what does market cap mean, what does P/E ratio mean, stock indicators explained"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "DefinedTermSet",
            name: "IntegralStocks Investing Glossary",
            url: `${SITE}/learn/glossary`,
            hasDefinedTerm: GLOSSARY.map((g) => ({
              "@type": "DefinedTerm",
              name: g.term,
              description: g.short,
              url: `${SITE}/learn/glossary/${g.slug}`,
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
              { "@type": "ListItem", position: 2, name: "Learn", item: `${SITE}/learn` },
              { "@type": "ListItem", position: 3, name: "Glossary", item: `${SITE}/learn/glossary` },
            ],
          },
        ]}
      />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/learn" className="hover:text-foreground transition-colors">← Learn</Link>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">Stock Market Glossary</h1>
        <p className="text-muted-foreground mb-6">{GLOSSARY.length} terms, one page each. Search or filter by category.</p>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
            {[{ id: "all" as const, label: "All" }, ...CATEGORIES.map((c) => ({ id: c, label: CATEGORY_LABEL[c] }))].map(
              (t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap border transition-colors",
                    tab === t.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
                  )}
                >
                  {t.label}
                </button>
              ),
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search terms..."
              className="pl-9 pr-4 py-1.5 rounded-lg border bg-card text-sm outline-none focus:ring-1 focus:ring-primary w-full sm:w-52"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">No terms match "{search}".</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {filtered.map((g) => (
              <Link
                key={g.slug}
                to={`/learn/glossary/${g.slug}`}
                className="block border rounded-lg p-4 hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="font-bold">{g.term}</div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                    {CATEGORY_LABEL[g.category]}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground line-clamp-2">{g.short}</div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default GlossaryIndex;
