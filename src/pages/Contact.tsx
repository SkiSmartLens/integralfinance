import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";

const Contact = () => (
  <div className="min-h-screen bg-background">
    <SEO
      title="Contact IntegralStocks"
      description="Get in touch with IntegralStocks for feedback, bug reports, or partnership inquiries."
      path="/contact"
    />
    <Header />
    <main className="container mx-auto px-4 py-10 max-w-3xl prose prose-neutral dark:prose-invert">
      <h1>Contact us</h1>
      <p>We'd love to hear from you — feedback, bug reports, or feature requests are all welcome.</p>
      <p>Email: <a href="mailto:hello@integralstocks.com">hello@integralstocks.com</a></p>
      <p>For data accuracy issues, please include the ticker symbol and the time you saw the issue.</p>
    </main>
    <SiteFooter />
  </div>
);

export default Contact;
