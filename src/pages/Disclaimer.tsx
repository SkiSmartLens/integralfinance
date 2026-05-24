import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";

const Disclaimer = () => (
  <div className="min-h-screen bg-background">
    <SEO
      title="Disclaimer — IntegralStocks"
      description="IntegralStocks provides educational stock market information only. Nothing on the site is investment advice."
      path="/disclaimer"
    />
    <Header />
    <main className="container mx-auto px-4 py-10 max-w-3xl prose prose-neutral dark:prose-invert">
      <h1>Disclaimer</h1>
      <p>
        IntegralStocks is an educational tool. The content on this site — including prices,
        charts, news summaries, and AI-generated insights — is provided for informational
        purposes only and <strong>does not constitute financial, investment, tax, or legal advice</strong>.
      </p>
      <p>
        Quotes may be delayed. AI-generated summaries can be incorrect or incomplete. Always do your own
        research and consult a licensed financial professional before making investment decisions.
      </p>
      <p>
        The paper trading simulator uses simulated money. Past performance, real or simulated, is not
        indicative of future results.
      </p>
    </main>
    <SiteFooter />
  </div>
);

export default Disclaimer;
