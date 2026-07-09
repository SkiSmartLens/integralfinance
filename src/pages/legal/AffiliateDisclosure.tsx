import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { Link2 } from "lucide-react";

const AffiliateDisclosure = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <SEO title="Affiliate Disclosure — Integral Stocks" description="Integral Stocks may earn commissions from affiliate links. Here's exactly how that works." path="/affiliate-disclosure" />
    <Header />
    <main className="flex-1 max-w-3xl mx-auto w-full px-5 sm:px-6 py-12 sm:py-16 prose prose-neutral dark:prose-invert">
      <div className="not-prose mb-8">
        <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-primary bg-accent px-3 py-1 rounded-full">
          <Link2 className="w-3.5 h-3.5" /> Legal
        </div>
        <h1 className="text-4xl font-extrabold mt-3">Affiliate Disclosure</h1>
        <p className="text-muted-foreground mt-2">Last updated: July 2026</p>
      </div>

      <h2>How we make money</h2>
      <p>
        Integral Stocks is free to use. To keep the lights on, we may include affiliate links to
        brokerages, educational products, books, or financial tools. If you click one of those
        links and open an account or make a purchase, we may earn a small commission at no extra
        cost to you.
      </p>

      <h2>Our editorial promise</h2>
      <p>
        We only recommend products we genuinely believe are useful to beginner investors.
        Commissions never influence which stocks we cover, what our AI insights say, or how the
        simulator behaves.
      </p>

      <h2>Clear labeling</h2>
      <p>
        Where practical, affiliate links are labeled or open in a new tab with the
        <code> rel="sponsored"</code> attribute so search engines and readers know what they are.
      </p>

      <h2>Not financial advice</h2>
      <p>
        Even when we recommend a partner, we're not giving you financial advice. Read our{" "}
        <a href="/terms">Terms of Service</a> for the full disclaimer, and do your own research
        before opening any brokerage account.
      </p>
    </main>
    <SiteFooter />
  </div>
);

export default AffiliateDisclosure;
