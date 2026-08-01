import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { FileText, AlertTriangle } from "lucide-react";
import { LegalHeader, Lead, Section, KeyPoint } from "@/components/legal/LegalBits";

const Terms = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <SEO title="Terms of Service — Integral Stocks" description="The terms that govern your use of Integral Stocks, including our No Financial Advice disclaimer." path="/terms" />
    <Header />
    <main className="flex-1 max-w-3xl mx-auto w-full px-5 sm:px-6 py-12 sm:py-16">
      <LegalHeader icon={<FileText className="w-3.5 h-3.5" />} title="Terms of Service" updated="July 2026" />

      <Lead>
        By using Integral Stocks you agree to these terms — the most important one being that we
        are not your financial advisor.
      </Lead>

      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-5 sm:p-6 flex items-start gap-3 my-8">
        <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <div className="text-lg sm:text-xl font-extrabold text-amber-900 dark:text-amber-200">
            No financial advice
          </div>
          <p className="text-base text-amber-900/90 dark:text-amber-200/90 mt-2 leading-[1.75]">
            Nothing on this site — AI insights, simulator outcomes, lessons, or news summaries — is
            investment advice, a recommendation, or a solicitation to buy or sell any security.
          </p>
          <p className="text-base text-amber-900/90 dark:text-amber-200/90 mt-3 leading-[1.75]">
            The simulator is for practice only. Do your own research and consult a licensed
            professional before making real investment decisions.
          </p>
        </div>
      </div>

      <Section title="Using Integral Stocks">
        <p>You must be at least 13 years old to use the service.</p>
        <p>
          Don't abuse the platform: no scraping, no reverse engineering, no attempts to break our
          security, and no illegal use.
        </p>
      </Section>

      <Section title="Your account">
        <p>
          You're responsible for keeping your login credentials secure and for activity in your
          account.
        </p>
        <p>Notify us right away if you suspect unauthorized access.</p>
      </Section>

      <Section title="Simulator disclaimer">
        <p>
          The paper-trading simulator uses delayed public market data. Prices, fills, and returns
          shown are approximations and are <strong>not</strong> what you would experience at a real
          broker.
        </p>
        <KeyPoint>Nothing in the simulator involves real money or real securities.</KeyPoint>
      </Section>

      <Section title="Content and AI insights">
        <p>
          AI-generated explanations, summaries, and lessons are provided as-is. They may be
          incomplete, out of date, or wrong.
        </p>
        <p>Verify anything important against primary sources.</p>
      </Section>

      <Section title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, Integral Stocks and its operators are not liable
          for any losses, damages, or missed opportunities arising from your use of the site or
          reliance on its content.
        </p>
      </Section>

      <Section title="Changes and termination">
        <p>
          We may update these terms or discontinue features at any time, and we'll notify you of
          material changes.
        </p>
        <p>You can stop using the service and delete your account at any time.</p>
      </Section>
    </main>
    <SiteFooter />
  </div>
);

export default Terms;
