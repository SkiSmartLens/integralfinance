import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { ShieldCheck } from "lucide-react";
import { LegalHeader, Lead, Section, KeyPoint } from "@/components/legal/LegalBits";

const Privacy = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <SEO title="Privacy Policy — Integral Stocks" description="How Integral Stocks collects, uses, and protects your personal information." path="/privacy" />
    <Header />
    <main className="flex-1 max-w-3xl mx-auto w-full px-5 sm:px-6 py-12 sm:py-16">
      <LegalHeader icon={<ShieldCheck className="w-3.5 h-3.5" />} title="Privacy Policy" updated="July 2026" />

      <Lead>
        We collect the minimum needed to run your account — and we never sell your personal
        information.
      </Lead>

      <Section title="What we collect">
        <p>
          When you create an account we store your email address, an optional display name, and the
          virtual portfolio activity you generate in the simulator.
        </p>
        <p>
          We also collect basic technical logs — browser type and IP address — to keep the service
          running and secure.
        </p>
      </Section>

      <Section title="How we use it">
        <p>
          Your data runs your account, saves your simulator progress, shows you the right content,
          and helps us improve the product.
        </p>
        <KeyPoint>We do not sell or rent your personal information to anyone. Ever.</KeyPoint>
      </Section>

      <Section title="Who we share it with">
        <p>
          We share data only with the infrastructure providers required to operate the site —
          hosting, database, and email delivery.
        </p>
        <p>They are contractually required to protect it.</p>
      </Section>

      <Section title="Cookies">
        <p>
          We use a small number of essential cookies for authentication and local settings.{" "}
          <strong>No invasive advertising trackers.</strong>
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          You can update or delete your account at any time. Reach out via the contact page and
          we'll respond within 30 days.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          If this policy changes materially, we'll notify you by email or with a prominent banner
          before the change takes effect.
        </p>
      </Section>
    </main>
    <SiteFooter />
  </div>
);

export default Privacy;
