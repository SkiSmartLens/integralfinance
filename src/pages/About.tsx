import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";

const About = () => (
  <div className="min-h-screen bg-background">
    <SEO
      title="About IntegralStocks — Stock Market Made Simple for Beginners"
      description="IntegralStocks helps beginners understand stock prices, market news, and why stocks move using plain-English AI insights."
      path="/about"
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "AboutPage",
        name: "About IntegralStocks",
        url: "https://integralstocks.com/about",
      }}
    />
    <Header />
    <main className="container mx-auto px-4 py-10 max-w-3xl prose prose-neutral dark:prose-invert">
      <h1>About IntegralStocks</h1>
      <p>
        IntegralStocks is a free, beginner-friendly stock market dashboard. We make it easy
        to track <strong>live stock prices</strong>, scan the day's market news, and — most
        importantly — understand <em>why</em> a stock moved using AI explanations written
        in plain English.
      </p>
      <h2>Who it's for</h2>
      <p>
        New investors, students, and curious readers who want to learn how the stock market
        actually works without wading through jargon, paywalls, or noisy charts.
      </p>
      <h2>What we do differently</h2>
      <ul>
        <li><strong>Plain-English summaries</strong> for every ticker — what the company does and why today's move happened.</li>
        <li><strong>AI insights</strong> tied to the news that drove the price action.</li>
        <li><strong>A free <Link to="/simulator">paper trading simulator</Link></strong> so you can practice without risking real money.</li>
        <li><strong>Curated <Link to="/news">market news</Link></strong>, <Link to="/screener">screeners</Link>, and an <Link to="/calendar">economic calendar</Link> in one place.</li>
      </ul>
      <p>
        Have feedback? <Link to="/contact">Get in touch</Link>. Read our{" "}
        <Link to="/disclaimer">disclaimer</Link> and <Link to="/data-sources">data sources</Link>.
      </p>
    </main>
    <SiteFooter />
  </div>
);

export default About;
