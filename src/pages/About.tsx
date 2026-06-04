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
        IntegralStocks is a free, beginner‑friendly stock market dashboard built to make investing concepts easier to
        understand. You can track <strong>live stock prices</strong>, browse market news, and—most importantly—learn{" "}
        <em>why</em> a stock moved through clear, plain‑English AI explanations.
      </p>

      <h2>Who it's for</h2>
      <p>
        IntegralStocks is designed for new investors, students, and curious readers who want to understand how the stock
        market works without dealing with jargon, paywalls, or overly complex charts.
      </p>

      <h2>What we do differently</h2>
      <ul>
        <li>
          <strong>Plain‑English summaries</strong> for every ticker—what the company does and what drove today’s price
          movement.
        </li>
        <li>
          <strong>AI insights</strong> that connect market news to real stock behavior.
        </li>
        <li>
          <strong>
            A free <Link to="/simulator">paper‑trading simulator</Link>
          </strong>{" "}
          so you can practice strategies without risking real money.
        </li>
        <li>
          <strong>
            Curated <Link to="/news">market news</Link>
          </strong>
          , <Link to="/screener">screeners</Link>, and an <Link to="/calendar">economic calendar</Link> all in one
          place.
        </li>
      </ul>

      <p>
        Have feedback? <Link to="/contact">Get in touch</Link>. You can also read our{" "}
        <Link to="/disclaimer">disclaimer</Link> and <Link to="/data-sources">data sources</Link> for more information
        about how the site works.
      </p>
    </main>
    <SiteFooter />
  </div>
);

export default About;
