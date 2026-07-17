import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";

const Blog = () => (
  <div className="min-h-screen bg-background">
    <SEO
      title="Why I Built IntegralStocks — The Story Behind the Site"
      description="The story of why a 13-year-old built a free, beginner-friendly stock market simulator and learning platform."
      path="/blog"
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: "Why I Built IntegralStocks",
        url: "https://integralstocks.com/blog",
      }}
    />
    <Header />
    <main className="container mx-auto px-4 py-10 max-w-3xl prose prose-neutral dark:prose-invert">
      <h1>Why I Built IntegralStocks</h1>
      <p className="text-muted-foreground">
        The story behind this project — and what I learned building it.
      </p>

      <p>
        My name is William Wolenski. I'm 13 years old, and my journey building IntegralStocks
        has been all over the place.
      </p>
      <p>
        I originally built IntegralStocks to help me win my class's stock market competition. My
        goal was a platform that used artificial intelligence to keep users informed. Using Groq
        AI, I was able to generate explanations of a stock's outlook — the positives, the
        negatives, and more. The amazing thing about AI for stock breakdowns is that it
        constantly updates based on real-world financial data.
      </p>
      <p>
        As the school stock game neared its end, I had turned $100k into $700k. But my greed got
        the best of me. I wasn't fully informed of the risks, and I shorted the wrong stock.
        Despite my stop losses, my position turned into negative $4 million. I was devastated —
        my position had gone from that of a titan to a laughingstock.
      </p>
      <p>
        With this newfound knowledge, I kept building the website. I decided to add a simulator,
        and I did everything I could to help inform users of the risks — diversification bars,
        bullish/bearish sentiment indicators, and more. I built my entire platform around keeping
        beginner investors informed, so they could hopefully learn from my mistake instead of
        repeating it.
      </p>

      <h2>What I Learned Building It</h2>
      <p>
        Building this website came with a lot of challenges — so many that I scrapped three
        earlier versions of the site entirely and started over. But those setbacks taught me more
        than any tutorial could have. Each new version improved dramatically.
      </p>
      <p>
        One of my biggest challenges was having limited coding knowledge. Building a full-stack
        stock website was an immense undertaking, so I turned to AI to help me code. I started
        with Copilot, but I was disappointed in the quality of its output. I then moved to
        Base44, but like Copilot, it came with a paywall after generating a certain amount of
        code, and I had a limited budget.
      </p>
      <p>
        Unsure what to do next, I took the advice of a friend who wishes to remain nameless and
        switched to Lovable, which let me build the bare-bones version of the site. But like the
        others, Lovable also had paywalls — and thanks to my parents' financial support, I was
        able to keep funding and building the project.
      </p>
      <p>
        Even after that, the challenges didn't stop. My determination to save money wherever I
        could — especially on hosting — meant spending many hours figuring things out myself
        instead of just paying for a shortcut.
      </p>

      <h2>What's Next</h2>
      <p>
        I plan to grow IntegralStocks into a free stock-learning platform for beginners — a place
        where people can learn about day-to-day market movement without feeling as overwhelmed as
        I was when I first started. I was intimidated by complicated terms and confusing
        interfaces that scare away beginner investors.
      </p>
      <p>
        I'm confident that by using AI to stay informed, people can make wiser financial
        decisions without having to manually track down information themselves.
      </p>
    </main>
    <SiteFooter />
  </div>
);

export default Blog;
