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

      <hr />

      <h2>Our story, in full</h2>
      <p>
        Integral Stocks began with a simple, frustrating observation: the stock market is one of the most
        important wealth-building tools in the world, yet almost nothing about it is explained in a way a curious
        beginner can actually understand. Open most finance websites and you are immediately buried under tickers
        flashing red and green, dense candlestick charts, and a vocabulary that assumes you already have an
        economics degree. For a teenager or a first-time investor, that wall of jargon sends a clear and
        discouraging message: <em>this is not for you</em>. We built Integral Stocks to tear that wall down.
      </p>
      <p>
        At its heart, Integral Stocks is a beginner-friendly platform that helps people understand <em>why</em>
        stocks move, not just <em>that</em> they moved. Anyone can tell you a stock dropped three percent today.
        What actually helps you learn is understanding the story behind that number — an earnings report that
        missed expectations, a new product launch, a shift in interest rates, or simply a wave of market-wide
        fear. Our AI insights are designed to translate that complexity into plain English, connecting real market
        news to real price behavior so that every movement becomes a small, digestible lesson rather than a
        mysterious blip on a chart.
      </p>
      <p>
        We believe the best way to learn investing is to do it — without the terror of losing real money. That is
        why our free paper-trading simulator gives you $100,000 in virtual cash to put theory into practice. You
        can build a portfolio, place trades, make mistakes, and watch what happens, all in a safe environment
        where the only thing at stake is your understanding. Mistakes made with fake money are some of the most
        valuable lessons a future investor can have, and we want you to make as many of them as you need before a
        single real dollar is ever on the line.
      </p>
      <p>
        Our learning path is deliberately short and sequential. Instead of overwhelming you with hundreds of
        articles, we offer a handful of focused lessons that build on one another: what a stock really is, how the
        market actually moves, how to read a price chart, the indicators that matter, and the patterns traders
        watch for. Paired with our plain-English glossary, these lessons are meant to be finished, not just
        bookmarked. We would rather you truly understand five concepts than feel guilty about fifty you never
        opened.
      </p>
      <p>
        Integral Stocks is built first and foremost for young people — students, teens, and anyone building their
        financial confidence before adulthood. Financial literacy is rarely taught well in schools, and the
        earlier someone understands how compounding, diversification, and risk work, the more powerful those ideas
        become over a lifetime. The decades of growth available to a sixteen-year-old who learns to invest wisely
        simply cannot be matched later, and we want to give that head start to as many people as possible, for
        free.
      </p>
      <p>
        Everything we do is guided by a few core principles. We keep things honest: we are an educational tool,
        not a brokerage or a source of financial advice, and we never pretend to predict the future. We keep
        things accessible: no paywalls hiding the basics, no setup hurdles, no requirement to hand over a bank
        account just to learn. And we keep things clear: if an explanation needs jargon, we define the jargon, and
        if a concept can be said simply, we say it simply.
      </p>
      <p>
        The market will always be uncertain, and no website can change that. But we firmly believe that
        understanding is the antidote to fear. When you grasp the forces moving a stock, the chart stops being
        intimidating and starts being interesting. Our long-term mission is to raise a generation of investors who
        are calm, curious, and informed — people who see a market dip and ask thoughtful questions instead of
        panicking, and who treat investing as a lifelong skill rather than a gamble. Wherever you are starting
        from, Integral Stocks is here to help you build your investing brain, one clear idea at a time.
      </p>
    </main>
    <SiteFooter />
  </div>
);

export default About;
