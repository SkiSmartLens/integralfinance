import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";

const Contact = () => (
  <div className="min-h-screen bg-background">
    <SEO
      title="Contact IntegralStocks"
      description="Reach out to IntegralStocks with feedback, bug reports, or general questions."
      path="/contact"
    />
    <Header />
    <main className="container mx-auto px-4 py-10 max-w-3xl prose prose-neutral dark:prose-invert">
      <h1>Contact Us</h1>

      <p>
        We’re always happy to hear from you. Whether you want to share feedback, report a bug, suggest a new feature, or
        ask a question about how IntegralStocks works, feel free to reach out. Your messages help us improve the site
        for everyone.
      </p>

      <p>
        <strong>Email:</strong> <a href="mailto:hello@integralstocks.com">hello@integralstocks.com</a>
      </p>

      <p>
        If you’re reporting an issue with stock data, please include the ticker symbol and the approximate time you
        noticed the problem so we can look into it quickly.
      </p>

      <p>
        We typically respond within a few days. For information about how we handle educational content, please see our
        Disclaimer page.
      </p>
    </main>
    <SiteFooter />
  </div>
);

export default Contact;
