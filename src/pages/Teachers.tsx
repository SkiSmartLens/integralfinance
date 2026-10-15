import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";

const Teachers = () => (
  <div className="min-h-screen bg-background">
    <SEO
      title="Free Stock Market Game for Classrooms & Clubs | IntegralStocks"
      description="Run a free stock market simulation for your class or investing club. Create a game, share a code, and watch a live leaderboard — no signup fees, no real money, no credit card."
      path="/teachers"
      keywords="stock market game for students, stock market game for teachers, classroom investing simulator, free paper trading for schools, investing club simulator, fantasy stock market for class"
    />
    <Header />
    <main className="container mx-auto px-4 py-10 max-w-3xl prose prose-neutral dark:prose-invert">
      <h1>A free stock market game for your class or club</h1>

      <p>
        IntegralStocks has a built-in paper-trading simulator — real tickers, real-ish prices, and zero real money
        on the line. It's a quick way to make a finance class, investing club, or FBLA/DECA-style competition
        hands-on instead of theoretical, and it costs nothing to run.
      </p>

      <h2>How it works</h2>
      <ol>
        <li>
          <strong>Create a game.</strong> Pick the starting cash (defaults to a clean $100,000 per student),
          how long it runs — a week, a semester, or unlimited — and whether shorting or leverage is allowed.
        </li>
        <li>
          <strong>Share the code.</strong> Every game gets a short join code and a one-click invite link. Post
          it to your class or club and students are in within seconds — no separate account approval needed on
          your end.
        </li>
        <li>
          <strong>Watch the leaderboard.</strong> Everyone's net worth updates live as the market moves. Click
          any player's name to see exactly what they're holding, so you (or the rest of the group) can see the
          reasoning behind a lead, not just the number.
        </li>
      </ol>

      <h2>Why it's useful in a classroom</h2>
      <ul>
        <li>
          <strong>No real money, ever.</strong> Students can go all-in on a bad idea and learn from it without
          any actual financial consequence.
        </li>
        <li>
          <strong>Explains the "why," not just the price.</strong> Every stock on the site comes with a
          plain-English AI note on why it moved — margins, earnings, a specific headline — so a lesson on a
          single stock turns into a lesson on how markets actually work.
        </li>
        <li>
          <strong>You control the rules.</strong> Keep it simple (no shorting, 1× leverage, equal starting
          cash) for a first-time class, or turn on shorting and leverage for a more advanced competition.
        </li>
        <li>
          <strong>Nothing to install or buy.</strong> It runs in a browser, works on a school Chromebook, and
          there's no credit card anywhere in the flow.
        </li>
      </ul>

      <h2>FAQ</h2>
      <p>
        <strong>Is this really free?</strong> Yes — creating a game, joining with a code, and everything in the
        simulator is free.
      </p>
      <p>
        <strong>Do students need to give a card or make a real brokerage account?</strong> No. It's a simulator;
        no real money or real brokerage is involved anywhere.
      </p>
      <p>
        <strong>How long can a game run?</strong> You choose — unlimited, or a fixed length like a week, a
        month, or a full semester.
      </p>
      <p>
        <strong>Can I reset a student's account if they mess something up?</strong> Yes — reach out via{" "}
        <Link to="/contact">the contact page</Link> and we can help.
      </p>

      <div className="flex flex-wrap gap-3 not-prose mt-8">
        <Link
          to="/sim/create?mode=friends"
          className="inline-flex items-center justify-center h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-extrabold"
        >
          Create a free class game
        </Link>
        <Link
          to="/simulator"
          className="inline-flex items-center justify-center h-12 px-6 rounded-2xl border-2 border-border font-extrabold"
        >
          See how the simulator works
        </Link>
      </div>
    </main>
    <SiteFooter />
  </div>
);

export default Teachers;
