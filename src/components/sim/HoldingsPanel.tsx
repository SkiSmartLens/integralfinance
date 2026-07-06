import { formatNumber } from "@/lib/yahoo";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./AnimatedNumber";
import { PieChart } from "lucide-react";

export interface Holding {
  id: string;
  symbol: string;
  shares: number;
  avgCost: number;
  last: number;
  prevClose: number;
}

const signed = (n: number, dollars = true) =>
  `${n >= 0 ? "+" : "-"}${dollars ? "$" : ""}${formatNumber(Math.abs(n))}${dollars ? "" : "%"}`;

export const HoldingsPanel = ({
  holdings,
  onSelect,
}: {
  holdings: Holding[];
  onSelect: (symbol: string) => void;
}) => {
  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <PieChart className="w-4 h-4 text-primary" />
        <h3 className="font-bold">Your holdings</h3>
        <span className="text-xs text-muted-foreground ml-auto">{holdings.length} position{holdings.length === 1 ? "" : "s"}</span>
      </div>

      {holdings.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10 px-4">
          No positions yet. Search a stock above and place your first trade.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                <th className="text-left font-semibold px-4 py-2.5">Symbol</th>
                <th className="text-right font-semibold px-2">Shares</th>
                <th className="text-right font-semibold px-2 hidden sm:table-cell">Avg cost</th>
                <th className="text-right font-semibold px-2">Price</th>
                <th className="text-right font-semibold px-2">Value</th>
                <th className="text-right font-semibold px-2 hidden md:table-cell">Day P/L</th>
                <th className="text-right font-semibold px-4">Unrealized P/L</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const value = h.last * h.shares;
                const cost = h.avgCost * h.shares;
                const uPl = value - cost;
                const uPlPct = cost > 0 ? (uPl / cost) * 100 : 0;
                const dayPl = (h.last - h.prevClose) * h.shares;
                return (
                  <tr
                    key={h.id}
                    onClick={() => onSelect(h.symbol)}
                    className="border-b last:border-0 cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-bold">{h.symbol}</td>
                    <td className="px-2 text-right tabular-nums">{h.shares}</td>
                    <td className="px-2 text-right tabular-nums hidden sm:table-cell">${formatNumber(h.avgCost)}</td>
                    <td className="px-2 text-right tabular-nums">
                      <AnimatedNumber value={h.last} format={(n) => `$${formatNumber(n)}`} />
                    </td>
                    <td className="px-2 text-right tabular-nums font-semibold">${formatNumber(value)}</td>
                    <td className={cn("px-2 text-right tabular-nums hidden md:table-cell", dayPl >= 0 ? "text-up" : "text-down")}>
                      {signed(dayPl)}
                    </td>
                    <td className={cn("px-4 text-right tabular-nums font-semibold", uPl >= 0 ? "text-up" : "text-down")}>
                      <div>{signed(uPl)}</div>
                      <div className="text-[11px] font-medium opacity-80">{signed(uPlPct, false)}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
