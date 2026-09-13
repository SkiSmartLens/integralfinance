import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { GLOSSARY } from "@/content/glossary";

const SITE = "https://integralstocks.com";

const GlossaryIndex = () => {
  const sorted = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));

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
        <p className="text-muted-foreground mb-8">
          Plain-English definitions for the investing terms you'll run into most often. Tap any term for a full
          one-page explanation.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {sorted.map((g) => (
            <Link
              key={g.slug}
              to={`/learn/glossary/${g.slug}`}
              className="block border rounded-lg p-4 hover:bg-accent transition-colors"
            >
              <div className="font-bold mb-1">{g.term}</div>
              <div className="text-sm text-muted-foreground line-clamp-2">{g.short}</div>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default GlossaryIndex;
