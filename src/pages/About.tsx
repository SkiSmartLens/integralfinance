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
      keywords="about IntegralStocks, beginner investing platform, stock market education, AI stock insights"
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
        IntegralStocks is a free stock site for people who don't already speak finance. Track{" "}
        <strong>live prices</strong>, read the news, and get a plain-English note on <em>why</em> a stock actually
        moved — no jargon required.
      </p>

      <h2>Who it's for</h2>
      <p>
        New investors, students, and anyone who wants to understand the market without wading through paywalls or
        a chart that looks like a cockpit.
      </p>

      <h2>What we do differently</h2>
      <ul>
        <li>
          <strong>Plain-English summaries</strong> on every ticker — what the company does, and what moved the
          price today.
        </li>
        <li>
          <strong>AI insights</strong> that tie news to the actual price action.
        </li>
        <li>
          A free <Link to="/simulator">paper-trading simulator</Link>, so you can practice with fake money before
          risking real money.
        </li>
        <li>
          <Link to="/news">Market news</Link>, <Link to="/screener">screeners</Link>, and an{" "}
          <Link to="/calendar">economic calendar</Link>, all in one place.
        </li>
      </ul>

      <p>
        Have feedback? <Link to="/contact">Get in touch</Link>. Our <Link to="/disclaimer">disclaimer</Link> and{" "}
        <Link to="/data-sources">data sources</Link> page cover how the site actually works.
      </p>

      <hr />

      <h2>Why we built this</h2>
      <p>
        I got tired of finance sites assuming you already had an econ degree. Every "beginner" explainer still
        buried the point under jargon, and every real-time chart looked like a cockpit dashboard. So I built the
        site I wish had existed when I first tried to figure out what a P/E ratio was.
      </p>
      <p>
        The goal isn't to tell you a stock dropped 3% — anyone can do that. It's to say why: a bad earnings call, a
        product launch, a rate decision, or just the market having a bad day. That's the part that actually teaches
        you something, so that's the part our AI summaries focus on.
      </p>
      <p>
        The simulator exists for the same reason. You get $100,000 in fake money to build a portfolio, place real
        trades, and mess up without it costing you anything. Losing fake money teaches you more than reading ten
        articles about risk management ever will.
      </p>
      <p>
        The lessons are short on purpose. A handful of pages — what a stock is, how to read a chart, which
        indicators matter, which patterns traders actually watch — instead of a hundred articles you'll never
        finish. Pair that with the glossary and you can look up anything mid-read.
      </p>
      <p>
        This is built with teenagers and first-time investors in mind especially. Most schools don't teach this
        stuff, and the earlier you understand compounding and risk, the more it pays off over a lifetime —
        literally.
      </p>
      <p>
        A few rules we hold ourselves to: we're not a brokerage and we don't give financial advice, so we won't
        pretend to know where the market's headed next. Nothing here is paywalled. And if a concept needs jargon to
        explain, we define the jargon right there instead of assuming you already know it.
      </p>
      <p>
        Markets are always going to be a little uncertain — that's not something a website fixes. But
        understanding what's actually happening beats guessing, every time. That's what this site is for.
      </p>
    </main>
    <SiteFooter />
  </div>
);

export default About;
