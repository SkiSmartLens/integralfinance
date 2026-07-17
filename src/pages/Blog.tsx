import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";

const Blog = () => (
  <div className="min-h-screen bg-background">
    <SEO
      title="Why I Built IntegralStocks — The Story Behind the Site"
      description="The story of why a student built a free, beginner-friendly stock market simulator and learning platform."
      path="/blog"
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: "Why I Built IntegralStocks",
        url: "https://integralstocks.com/blog",
      }}
    />
    <Header />
    <main className="container mx-auto px-4 py-10 max-w-3xl prose prose-neutral dark:prose-invert">
      <h1>Why I Built IntegralStocks</h1>
      <p className="text-muted-foreground">
        The story behind this project — and what I learned building it.
      </p>

      <p>
        Write your story here — what got you interested in the stock market, the school
        project that started it, and why you noticed existing platforms were confusing
        for beginners.
      </p>

      <h2>What I learned</h2>
      <p>
        Talk about the technical challenges, what surprised you, or what you'd do
        differently.
      </p>

      <h2>What's next</h2>
      <p>
        Share what you're planning to add or improve.
      </p>
    </main>
    <SiteFooter />
  </div>
);

export default Blog;
