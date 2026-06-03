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
        IntegralStocks is an educational tool designed to help beginners better understand how the stock market works.
        All content on this site — including stock prices, charts, news summaries, explanations, and AI‑generated
        insights — is provided strictly for informational and educational purposes. Nothing on this website should be
        interpreted as financial, investment, tax, or legal advice.
      </p>

      <p>
        Market data, quotes, and other information displayed on the site may be delayed, incomplete, or inaccurate.
        AI‑generated summaries may contain errors or omissions. While we aim to provide helpful and reliable
        information, we cannot guarantee the accuracy, completeness, or timeliness of any content. Always verify
        information independently and consult a licensed financial professional before making any investment decisions.
      </p>

      <p>
        The paper‑trading simulator uses simulated money and does not reflect real trading conditions. Past performance
        — whether real, historical, or simulated — is not indicative of future results. IntegralStocks is not
        responsible for any financial losses, decisions, or actions taken based on the information provided on this
        site.
      </p>
    </main>
    <SiteFooter />
  </div>
);

export default Disclaimer;
