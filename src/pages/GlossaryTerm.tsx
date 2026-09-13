import { Link, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { GLOSSARY, getGlossaryEntry } from "@/content/glossary";
import NotFound from "./NotFound";

const SITE = "https://integralstocks.com";

const GlossaryTerm = () => {
  const { slug = "" } = useParams();
  const entry = getGlossaryEntry(slug);
  if (!entry) return <NotFound />;

  const canonicalPath = `/learn/glossary/${entry.slug}`;
  const title = `What Does ${entry.term} Mean? — Plain-English Definition | IntegralStocks`;
  const related = entry.related.map((s) => getGlossaryEntry(s)).filter((e): e is NonNullable<typeof e> => !!e);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={title}
        description={entry.short}
        path={canonicalPath}
        keywords={`what does ${entry.term.toLowerCase()} mean, ${entry.term.toLowerCase()} definition, ${entry.term.toLowerCase()} explained, stock market glossary`}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "DefinedTerm",
            name: entry.term,
            description: entry.short,
            url: `${SITE}${canonicalPath}`,
            inDefinedTermSet: `${SITE}/learn/glossary`,
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: `What does ${entry.term} mean?`,
                acceptedAnswer: { "@type": "Answer", text: entry.short },
              },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
              { "@type": "ListItem", position: 2, name: "Learn", item: `${SITE}/learn` },
              { "@type": "ListItem", position: 3, name: "Glossary", item: `${SITE}/learn/glossary` },
              { "@type": "ListItem", position: 4, name: entry.term, item: `${SITE}${canonicalPath}` },
            ],
          },
        ]}
      />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-2xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/learn" className="hover:text-foreground transition-colors">Learn</Link>
          <span>/</span>
          <Link to="/learn/glossary" className="hover:text-foreground transition-colors">Glossary</Link>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight mb-4">
          What does <span className="text-primary">{entry.term}</span> mean?
        </h1>

        <p className="text-lg leading-relaxed font-medium bg-accent/50 border rounded-lg p-4 mb-6">
          {entry.short}
        </p>

        <p className="text-muted-foreground leading-relaxed mb-8">{entry.body}</p>

        <Link
          to={entry.learnMore.to}
          className="inline-flex items-center gap-1.5 text-primary font-bold hover:underline mb-10"
        >
          Learn more in {entry.learnMore.label} →
        </Link>

        {related.length > 0 && (
          <div className="border-t pt-6">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground mb-3">
              Related terms
            </h2>
            <div className="flex flex-wrap gap-2">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  to={`/learn/glossary/${r.slug}`}
                  className="px-3 py-1.5 rounded-full border text-sm font-semibold hover:bg-accent transition-colors"
                >
                  {r.term}
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default GlossaryTerm;
