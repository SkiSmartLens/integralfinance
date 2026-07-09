import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { FileText, AlertTriangle } from "lucide-react";

const Terms = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <SEO title="Terms of Service — Integral Stocks" description="The terms that govern your use of Integral Stocks, including our No Financial Advice disclaimer." path="/terms" />
    <Header />
    <main className="flex-1 max-w-3xl mx-auto w-full px-5 sm:px-6 py-12 sm:py-16 prose prose-neutral dark:prose-invert">
      <div className="not-prose mb-8">
        <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-primary bg-accent px-3 py-1 rounded-full">
          <FileText className="w-3.5 h-3.5" /> Legal
        </div>
        <h1 className="text-4xl font-extrabold mt-3">Terms of Service</h1>
        <p className="text-muted-foreground mt-2">Last updated: July 2026</p>
      </div>

      <div className="not-prose rounded-2xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-5 flex items-start gap-3 my-6">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <div className="font-extrabold text-amber-900 dark:text-amber-200">No financial advice</div>
          <p className="text-sm text-amber-900/90 dark:text-amber-200/90 mt-1 leading-relaxed">
            Integral Stocks is an educational tool. Nothing on this site — including AI insights,
            simulator outcomes, lessons, or news summaries — is investment advice, a recommendation,
            or a solicitation to buy or sell any security. The simulator is for practice only and
            does not represent real trading conditions. Do your own research and consult a licensed
            professional before making real investment decisions.
          </p>
        </div>
      </div>

      <h2>Using Integral Stocks</h2>
      <p>
        You must be at least 13 years old to use the service. Don't abuse the platform: no
        scraping, no reverse engineering, no attempts to break our security, and no illegal use.
      </p>

      <h2>Your account</h2>
      <p>
        You're responsible for keeping your login credentials secure and for activity in your
        account. Notify us right away if you suspect unauthorized access.
      </p>

      <h2>Simulator disclaimer</h2>
      <p>
        The paper-trading simulator uses delayed public market data. Prices, fills, and returns
        shown are approximations and are <strong>not</strong> what you would experience on a real
        broker. Nothing in the simulator involves real money or real securities.
      </p>

      <h2>Content and AI insights</h2>
      <p>
        AI-generated explanations, summaries, and lessons are provided as-is. They may be
        incomplete, out of date, or wrong. Verify anything important against primary sources.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Integral Stocks and its operators are not liable
        for any losses, damages, or missed opportunities arising from your use of the site or
        reliance on its content.
      </p>

      <h2>Changes and termination</h2>
      <p>
        We may update these terms or discontinue features at any time. We'll notify you of
        material changes. You can stop using the service and delete your account at any time.
      </p>
    </main>
    <SiteFooter />
  </div>
);

export default Terms;
