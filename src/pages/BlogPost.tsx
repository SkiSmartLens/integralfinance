import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Clock, LineChart } from "lucide-react";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { getPost, POSTS, redirectFor, renderBody } from "@/content/blog";
import { featuredImage } from "@/content/blogImages";
import NotFound from "./NotFound";

const SITE = "https://integralstocks.com";

const BlogPost = () => {
  const { slug = "" } = useParams();
  const post = getPost(slug);
  const redirect = post ? undefined : redirectFor(slug);
  if (redirect) return <Navigate to={`/blog/${redirect}`} replace />;
  if (!post) return <NotFound />;
  const blocks = renderBody(post.body);

  const related = POSTS.filter((p) => p.slug !== post.slug && p.tags?.some((t) => post.tags?.includes(t))).slice(0, 3);
  const hero = featuredImage(post);
  const canonicalPath = `/blog/${post.slug}`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={`${post.title} | Integral Stocks Blog`}
        description={post.description}
        path={canonicalPath}
        image={`${SITE}${hero.src}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.description,
          datePublished: post.publishedAt,
          dateModified: post.publishedAt,
          image: `${SITE}${hero.src}`,
          url: `${SITE}${canonicalPath}`,
          author: { "@type": "Organization", name: "IntegralStocks" },
          publisher: { "@type": "Organization", name: "IntegralStocks", logo: { "@type": "ImageObject", url: "https://integralstocks.com/favicon.png" } },
          mainEntityOfPage: `${SITE}${canonicalPath}`,
        }}
      />
      <Header />
      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 flex-1">
        <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> All posts
        </Link>

        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-primary bg-accent px-3 py-1 rounded-full mb-4">
          <BookOpen className="w-3.5 h-3.5" /> Blog
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] mb-4">{post.title}</h1>
        <div className="text-xs text-muted-foreground mb-6 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          <span>{post.readMinutes} min read</span>
          <span>·</span>
          <span>{new Date(post.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
        </div>

        <img
          src={hero.src}
          alt={hero.alt}
          width={1200}
          height={630}
          className="w-full rounded-xl border mb-8 aspect-[1200/630] object-cover"
        />


        <article className="prose-like space-y-5 text-base leading-relaxed">
          {blocks.map((b, i) => {
            if (b.type === "h2") return <h2 key={i} className="text-2xl font-extrabold tracking-tight mt-8" dangerouslySetInnerHTML={{ __html: b.html }} />;
            if (b.type === "h3") return <h3 key={i} className="text-lg font-bold mt-6" dangerouslySetInnerHTML={{ __html: b.html }} />;
            if (b.type === "ul") return <div key={i} dangerouslySetInnerHTML={{ __html: b.html }} />;
            return <p key={i} dangerouslySetInnerHTML={{ __html: b.html }} />;
          })}
        </article>

        {post.tickers && post.tickers.length > 0 && (
          <section className="mt-12 border-t pt-8">
            <h2 className="text-lg font-extrabold flex items-center gap-2 mb-4">
              <LineChart className="w-4 h-4 text-primary" /> Related stocks
            </h2>
            <div className="flex flex-wrap gap-2">
              {post.tickers.map((t) => (
                <Link
                  key={t}
                  to={`/stocks/${t.toLowerCase()}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border-2 border-primary/30 text-sm font-bold hover:bg-accent transition-colors"
                >
                  {t}
                </Link>
              ))}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-10 border-t pt-8">
            <h2 className="text-lg font-extrabold mb-4">More for beginners</h2>
            <ul className="space-y-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link to={`/blog/${r.slug}`} className="group inline-flex items-center gap-1 font-bold hover:text-primary">
                    {r.title} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default BlogPost;
