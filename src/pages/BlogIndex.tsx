import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { POSTS } from "@/content/blog";
import { featuredImage } from "@/content/blogImages";

const CATEGORY_ORDER = [
  "Beginner Basics",
  "Investing Basics",
  "Market Education",
  "Stock Research",
  "Technical Analysis",
  "Risk Management",
  "Wealth Building",
  "Market Psychology",
  "Financial Literacy",
  "Platform Story",
];

const BlogIndex = () => {
  const sorted = [...POSTS].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
  const groups = new Map<string, typeof POSTS>();
  for (const p of sorted) {
    const cat = p.category ?? "Other";
    if (!groups.has(cat)) groups.set(cat, [] as any);
    (groups.get(cat) as any).push(p);
  }
  const orderedCats = [
    ...CATEGORY_ORDER.filter((c) => groups.has(c)),
    ...Array.from(groups.keys()).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Blog — Beginner Investing Guides & Explainers"
        description="Plain-English guides for beginner investors: how to start with $100, how to read a chart, what P/E ratio means, paper trading vs real trading, and more."
        path="/blog"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "IntegralStocks Blog",
          url: "https://integralstocks.com/blog",
        }}
      />
      <Header />
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 flex-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-primary bg-accent px-3 py-1 rounded-full mb-4">
          <BookOpen className="w-3.5 h-3.5" /> Blog
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] mb-3">
          Learn to invest, one short read at a time
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground mb-10 max-w-2xl">
          Beginner-friendly explainers on stocks, charts, valuation, and the tools we use — written for people who've never invested before.
        </p>

        {orderedCats.map((cat) => (
          <section key={cat} className="mb-12">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-2">
              {cat}
            </h2>
            <ul className="divide-y border-t">
              {(groups.get(cat) ?? []).map((p) => (
                <li key={p.slug}>
                  <Link
                    to={`/blog/${p.slug}`}
                    className="group block py-6 hover:bg-muted/40 transition-colors -mx-4 px-4 rounded-lg sm:flex sm:gap-5"
                  >
                    <img
                      src={featuredImage(p).src}
                      alt={featuredImage(p).alt}
                      loading="lazy"
                      width={1200}
                      height={630}
                      className="w-full sm:w-40 shrink-0 rounded-lg border mb-3 sm:mb-0 aspect-[1200/630] object-cover"
                    />
                    <div className="min-w-0">
                    <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{p.readMinutes} min read</span>
                      <span>·</span>
                      <span>{new Date(p.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug group-hover:text-primary transition-colors">
                      {p.title}
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground mt-2 leading-relaxed">
                      {p.description}
                    </p>
                    <span className="inline-flex items-center gap-1 mt-3 text-sm font-bold text-primary">
                      Read the post <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
      <SiteFooter />
    </div>
  );
};

export default BlogIndex;
