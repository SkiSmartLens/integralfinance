import { Link } from "react-router-dom";

export const SiteFooter = () => (
  <footer className="border-t mt-12 bg-card">
    <div className="container mx-auto px-4 py-8 max-w-6xl grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
      <div>
        <h2 className="font-bold mb-2">IntegralStocks</h2>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Beginner-friendly stock prices, news, and AI insights that explain why stocks move.
        </p>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Markets</h3>
        <ul className="space-y-1 text-muted-foreground">
          <li><Link to="/stocks" className="hover:text-foreground">Stocks</Link></li>
          <li><Link to="/market-brief" className="hover:text-foreground">Market Brief</Link></li>
          <li><Link to="/screener" className="hover:text-foreground">Screener</Link></li>
          <li><Link to="/calendar" className="hover:text-foreground">Economic Calendar</Link></li>
          <li><Link to="/watchlist" className="hover:text-foreground">Watchlist</Link></li>
        </ul>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Learn & Play</h3>
        <ul className="space-y-1 text-muted-foreground">
          <li><Link to="/start" className="hover:text-foreground">Start Here</Link></li>
          <li><Link to="/simulator" className="hover:text-foreground">Trading Simulator</Link></li>
          <li><Link to="/faq" className="hover:text-foreground">FAQ</Link></li>
          <li><Link to="/about" className="hover:text-foreground">About</Link></li>
        </ul>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Legal</h3>
        <ul className="space-y-1 text-muted-foreground">
          <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
          <li><Link to="/disclaimer" className="hover:text-foreground">Disclaimer</Link></li>
          <li><Link to="/data-sources" className="hover:text-foreground">Data Sources</Link></li>
        </ul>
      </div>
    </div>
    <div className="border-t py-4 text-center text-xs text-muted-foreground">
      © {new Date().getFullYear()} IntegralStocks · Live data via Yahoo Finance. Prices may be delayed. Not investment advice.
    </div>
  </footer>
);
