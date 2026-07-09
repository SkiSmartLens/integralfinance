import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { ShieldCheck } from "lucide-react";

const Privacy = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <SEO title="Privacy Policy — Integral Stocks" description="How Integral Stocks collects, uses, and protects your personal information." path="/privacy" />
    <Header />
    <main className="flex-1 max-w-3xl mx-auto w-full px-5 sm:px-6 py-12 sm:py-16 prose prose-neutral dark:prose-invert">
      <div className="not-prose mb-8">
        <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-primary bg-accent px-3 py-1 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5" /> Legal
        </div>
        <h1 className="text-4xl font-extrabold mt-3">Privacy Policy</h1>
        <p className="text-muted-foreground mt-2">Last updated: July 2026</p>
      </div>

      <h2>What we collect</h2>
      <p>
        When you create an account we store your email address, an optional display name, and the
        virtual portfolio activity you generate in the simulator. We also collect basic technical
        logs (browser type, IP address) to keep the service running and secure.
      </p>

      <h2>How we use it</h2>
      <p>
        Your data is used to run your account, save your simulator progress, show you the right
        content, and improve the product. We do not sell or rent your personal information to
        anyone.
      </p>

      <h2>Who we share it with</h2>
      <p>
        We share data only with the infrastructure providers required to operate the site
        (hosting, database, email delivery). They are contractually required to protect it.
      </p>

      <h2>Cookies</h2>
      <p>
        We use a small number of essential cookies for authentication and local settings. We do
        not use invasive advertising trackers.
      </p>

      <h2>Your rights</h2>
      <p>
        You can update or delete your account at any time. Reach out via the contact page and
        we'll respond within 30 days.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes materially we'll notify you by email or a prominent banner before
        the change takes effect.
      </p>
    </main>
    <SiteFooter />
  </div>
);

export default Privacy;
