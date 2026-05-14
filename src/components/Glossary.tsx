import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Plain-English definitions of common investing terms shown via small (?) icons. */
export const GLOSSARY: Record<string, string> = {
  "Market Cap":
    "The total value of a company's shares. Calculated as share price × number of shares. Bigger = larger company.",
  "P/E Ratio":
    "Price-to-Earnings. How many dollars investors pay for each $1 of company profit. High P/E = expensive or fast-growing.",
  Volume:
    "How many shares changed hands today. Higher volume usually means more interest in the stock.",
  "52-Week Range":
    "The lowest and highest price the stock hit in the past year. Helps you see how it's swung.",
  Dividend:
    "Cash a company pays to shareholders, usually quarterly. Not all companies pay one.",
  Yield:
    "Annual dividend ÷ price, as a %. Like an interest rate for owning the stock.",
  Change:
    "How much the price moved today vs. yesterday's close.",
  "After-hours":
    "Trading that happens outside regular hours (9:30 AM – 4 PM ET). Prices can swing more.",
  Ticker: "The short symbol used to identify a stock (e.g. AAPL = Apple).",
  Index:
    "A basket of many stocks tracked together (e.g. S&P 500 tracks 500 big U.S. companies).",
  ETF: "Exchange-Traded Fund — a single ticker that holds many stocks at once. Easy way to diversify.",
  Bull: "Optimistic — expecting prices to rise.",
  Bear: "Pessimistic — expecting prices to fall.",
  Earnings:
    "A company's profit, reported every 3 months. Stocks often jump or drop on earnings day.",
};

interface Props {
  term: keyof typeof GLOSSARY | string;
  children?: React.ReactNode;
  className?: string;
}

/** Inline term with a (?) tooltip explaining it in plain English. */
export const Term = ({ term, children, className }: Props) => {
  const def = GLOSSARY[term as string];
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={
              "inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 cursor-help " +
              (className ?? "")
            }
          >
            {children ?? term}
            <Info className="w-3 h-3 opacity-60" />
          </span>
        </TooltipTrigger>
        {def && (
          <TooltipContent className="max-w-xs text-xs leading-relaxed">
            {def}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};
