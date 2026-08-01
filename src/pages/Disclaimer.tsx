import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { AlertTriangle } from "lucide-react";
import { LegalHeader, Lead, Section, KeyPoint } from "@/components/legal/LegalBits";

const Disclaimer = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <SEO
      title="Disclaimer — IntegralStocks"
      description="IntegralStocks provides educational stock market information only. Nothing on the site is investment advice."
      path="/disclaimer"
    />
    <Header />
    <main className="flex-1 max-w-3xl mx-auto w-full px-5 sm:px-6 py-12 sm:py-16">
      <LegalHeader icon={<AlertTriangle className="w-3.5 h-3.5" />} title="Disclaimer" updated="July 2026" />

      <Lead>
        IntegralStocks is a learning tool — not a broker, not an advisor, and not a source of
        investment advice.
      </Lead>

      <Section title="Education only">
        <p>
          Everything on this site — stock prices, charts, news summaries, lessons, and AI-generated
          insights — exists to help beginners understand how the market works.
        </p>
        <p>
          Nothing here should be interpreted as financial, investment, tax, or legal advice, and
          nothing here is a recommendation to buy or sell any security.
        </p>
        <KeyPoint>Use this site to learn. Make real money decisions with a licensed professional.</KeyPoint>
      </Section>

      <Section title="Data may be wrong or delayed">
        <p>
          Market data, quotes, and other information shown may be delayed, incomplete, or simply
          inaccurate. AI-generated summaries can contain errors and omissions.
        </p>
        <p>
          We aim for helpful and reliable information, but we cannot guarantee accuracy,
          completeness, or timeliness. <strong>Always verify anything important independently.</strong>
        </p>
      </Section>

      <Section title="The simulator is not real trading">
        <p>
          The paper-trading simulator uses simulated money and does not reflect real trading
          conditions — real fills, spreads, fees, and slippage all differ.
        </p>
        <p>
          Past performance, whether real, historical, or simulated, is not indicative of future
          results.
        </p>
        <KeyPoint label="Our liability">
          IntegralStocks is not responsible for any financial losses, decisions, or actions taken
          based on information provided on this site.
        </KeyPoint>
      </Section>
    </main>
    <SiteFooter />
  </div>
);

export default Disclaimer;
