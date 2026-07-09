import { Link } from "react-router-dom";

export const SiteFooter = () => (
  <footer className="border-t mt-16 bg-card">
    <div className="container mx-auto px-4 py-10 max-w-6xl grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
      <div>
        <h2 className="font-extrabold mb-2 text-base">IntegralStocks</h2>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Beginner-friendly stock prices, news, and AI insights that explain why stocks move.
        </p>
      </div>
      <div>
        <h3 className="font-extrabold mb-3 uppercase text-xs tracking-wider text-muted-foreground">Markets</h3>
        <ul className="space-y-2">
          <li><Link to="/stocks" className="hover:text-primary transition-colors">Stocks</Link></li>
          <li><Link to="/market-brief" className="hover:text-primary transition-colors">Market Brief</Link></li>
          <li><Link to="/screener" className="hover:text-primary transition-colors">Screener</Link></li>
          <li><Link to="/calendar" className="hover:text-primary transition-colors">Economic Calendar</Link></li>
          <li><Link to="/watchlist" className="hover:text-primary transition-colors">Watchlist</Link></li>
        </ul>
      </div>
      <div>
        <h3 className="font-extrabold mb-3 uppercase text-xs tracking-wider text-muted-foreground">Learn & Play</h3>
        <ul className="space-y-2">
          <li><Link to="/academy" className="hover:text-primary transition-colors">Investor Academy</Link></li>
          <li><Link to="/sim/lobby" className="hover:text-primary transition-colors">Trading Simulator</Link></li>
          <li><Link to="/translate" className="hover:text-primary transition-colors">Jargon Translator</Link></li>
          <li><Link to="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
          <li><Link to="/about" className="hover:text-primary transition-colors">About</Link></li>
        </ul>
      </div>
      <div>
        <h3 className="font-extrabold mb-3 uppercase text-xs tracking-wider text-muted-foreground">Legal</h3>
        <ul className="space-y-2">
          <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
          <li><Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
          <li><Link to="/affiliate-disclosure" className="hover:text-primary transition-colors">Affiliate Disclosure</Link></li>
          <li><Link to="/disclaimer" className="hover:text-primary transition-colors">Disclaimer</Link></li>
          <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
        </ul>
      </div>
    </div>
    <div className="border-t py-5 text-center text-xs text-muted-foreground px-4">
      © {new Date().getFullYear()} IntegralStocks · Educational only — not investment advice · Prices may be delayed.
    </div>
  </footer>
);
