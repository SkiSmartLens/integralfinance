import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { Link2 } from "lucide-react";
import { LegalHeader, Lead, Section, KeyPoint } from "@/components/legal/LegalBits";

const AffiliateDisclosure = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <SEO title="Affiliate Disclosure — Integral Stocks" description="Integral Stocks may earn commissions from affiliate links. Here's exactly how that works." path="/affiliate-disclosure" />
    <Header />
    <main className="flex-1 max-w-3xl mx-auto w-full px-5 sm:px-6 py-12 sm:py-16">
      <LegalHeader icon={<Link2 className="w-3.5 h-3.5" />} title="Affiliate Disclosure" updated="July 2026" />

      <Lead>
        Integral Stocks is free to use. Some links on the site earn us a commission — and that
        never costs you anything extra.
      </Lead>

      <Section title="How we make money">
        <p>
          We may include affiliate links to brokerages, educational products, books, or financial
          tools.
        </p>
        <p>
          If you click one of those links and open an account or make a purchase, we may earn a
          small commission at no extra cost to you.
        </p>
      </Section>

      <Section title="Our editorial promise">
        <p>
          We only recommend products we genuinely believe are useful to beginner investors.
        </p>
        <KeyPoint>
          Commissions never influence which stocks we cover, what our AI insights say, or how the
          simulator behaves.
        </KeyPoint>
      </Section>

      <Section title="Clear labeling">
        <p>
          Where practical, affiliate links are labeled or open in a new tab with the{" "}
          <code className="text-sm font-mono text-foreground">rel="sponsored"</code> attribute, so
          both readers and search engines know exactly what they are.
        </p>
      </Section>

      <Section title="Still not financial advice">
        <p>
          Even when we recommend a partner, we are not giving you financial advice. Read our{" "}
          <a href="/terms" className="text-primary font-semibold underline underline-offset-4">
            Terms of Service
          </a>{" "}
          for the full disclaimer, and do your own research before opening any brokerage account.
        </p>
      </Section>
    </main>
    <SiteFooter />
  </div>
);

export default AffiliateDisclosure;
