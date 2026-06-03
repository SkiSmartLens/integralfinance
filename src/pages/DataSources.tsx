import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";

const DataSources = () => (
  <div className="min-h-screen bg-background">
    <SEO
      title="Data Sources & Attribution — IntegralStocks"
      description="Learn where IntegralStocks obtains stock prices, market news, and AI-generated insights."
      path="/data-sources"
    />
    <Header />
    <main className="container mx-auto px-4 py-10 max-w-3xl prose prose-neutral dark:prose-invert">
      <h1>Data Sources & Attribution</h1>

      <p>
        IntegralStocks aggregates publicly available financial information and combines it with AI‑generated educational
        insights. Below is a breakdown of the primary data sources and tools used throughout the site.
      </p>

      <ul>
        <li>
          <strong>Quotes, charts, and search:</strong> Retrieved from publicly accessible Yahoo Finance endpoints. Stock
          quotes and market data may be delayed or incomplete depending on availability.
        </li>

        <li>
          <strong>Market news:</strong> Sourced from Yahoo Finance news feeds and publicly available publisher RSS
          feeds. Headlines and summaries reflect the content provided by each publisher.
        </li>

        <li>
          <strong>AI insights:</strong> Generated using large language models accessed through the Lovable AI Gateway,
          including models from the Google Gemini and OpenAI GPT families. AI content may contain inaccuracies or
          omissions.
        </li>

        <li>
          <strong>Logos and trademarks:</strong> All company names, logos, and trademarks are the property of their
          respective owners and are used solely for identification and informational purposes.
        </li>
      </ul>

      <p>
        IntegralStocks is not affiliated with Yahoo, Google, OpenAI, or any other data provider. If you represent a data
        source and have questions or concerns about attribution or usage, please <a href="/contact">contact us</a>.
      </p>
    </main>
    <SiteFooter />
  </div>
);

export default DataSources;
