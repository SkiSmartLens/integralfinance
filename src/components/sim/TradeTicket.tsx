import { useEffect, useMemo, useState } from "react";
import { formatNumber } from "@/lib/yahoo";
import { cn } from "@/lib/utils";
import { Loader2, TrendingUp, TrendingDown, Wallet } from "lucide-react";

interface Props {
  symbol: string;
  price?: number;
  cash: number;
  /** Shares currently held of this symbol (0 if none). */
  heldShares: number;
  placing: boolean;
  onExecute: (side: "buy" | "sell", shares: number) => void;
}

export const TradeTicket = ({ symbol, price, cash, heldShares, placing, onExecute }: Props) => {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [qty, setQty] = useState(1);

  // If you hold nothing, force Buy.
  useEffect(() => {
    if (heldShares <= 0 && side === "sell") setSide("buy");
  }, [heldShares, side]);

  const maxShares = useMemo(() => {
    if (side === "sell") return Math.max(0, heldShares);
    if (!price || price <= 0) return 0;
    return Math.max(0, Math.floor(cash / price));
  }, [side, price, cash, heldShares]);

  const estCost = price ? price * qty : 0;
  const insufficient = side === "buy" && estCost > cash;
  const overSell = side === "sell" && qty > heldShares;
  const invalidQty = !Number.isFinite(qty) || qty < 1;
  const disabled = placing || invalidQty || insufficient || overSell || !price || (side === "sell" && heldShares <= 0);

  const validationMsg = invalidQty
    ? "Enter a whole number of shares."
    : insufficient
    ? "Not enough cash for this order."
    : overSell
    ? `You only hold ${heldShares} shares.`
    : null;

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold">Trade {symbol}</h3>
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1 tabular-nums">
          <Wallet className="w-3.5 h-3.5" /> ${formatNumber(cash)}
        </span>
      </div>

      {/* Buy / Sell toggle */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-muted/60 rounded-xl mb-3">
        {(["buy", "sell"] as const).map((s) => {
          const isSellDisabled = s === "sell" && heldShares <= 0;
          return (
            <button
              key={s}
              type="button"
              disabled={isSellDisabled}
              onClick={() => setSide(s)}
              className={cn(
                "py-2 rounded-lg text-sm font-bold capitalize transition-all",
                side === s
                  ? s === "buy"
                    ? "bg-up text-white shadow"
                    : "bg-down text-white shadow"
                  : "text-muted-foreground hover:text-foreground",
                isSellDisabled && "opacity-40 cursor-not-allowed"
              )}
            >
              {s}
            </button>
          );
        })}
      </div>

      {/* Quantity */}
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
        Quantity
      </label>
      <div className="flex items-center gap-2 mb-2">
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
          className={cn(
            "flex-1 h-10 px-3 rounded-lg bg-muted/60 border outline-none text-sm font-semibold tabular-nums transition-colors focus:bg-card",
            validationMsg ? "border-down/50 focus:border-down" : "border-transparent focus:border-primary/40"
          )}
        />
        <button
          type="button"
          onClick={() => setQty(Math.max(1, maxShares))}
          disabled={maxShares < 1}
          className="h-10 px-3 rounded-lg bg-muted text-xs font-bold uppercase hover:bg-accent transition-colors disabled:opacity-40"
        >
          Max
        </button>
      </div>
      <div className="flex gap-1 mb-3">
        {[0.25, 0.5, 0.75].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setQty(Math.max(1, Math.floor(maxShares * f)))}
            disabled={maxShares < 1}
            className="flex-1 py-1 rounded-md bg-muted/60 text-[11px] font-bold hover:bg-accent transition-colors disabled:opacity-40"
          >
            {f * 100}%
          </button>
        ))}
      </div>

      {/* Estimate */}
      <div className="rounded-xl bg-muted/40 border p-3 space-y-1.5 text-sm mb-3">
        <Row label="Market price" value={price ? `$${formatNumber(price)}` : "—"} />
        <Row label="Shares" value={qty.toLocaleString()} />
        <Row
          label={side === "buy" ? "Estimated cost" : "Estimated proceeds"}
          value={price ? `$${formatNumber(estCost)}` : "—"}
          bold
        />
        <Row
          label="Cash after"
          value={`$${formatNumber(side === "buy" ? cash - estCost : cash + estCost)}`}
          className={side === "buy" && cash - estCost < 0 ? "text-down" : undefined}
        />
      </div>

      {validationMsg && (
        <p className="text-xs font-semibold text-down mb-2 animate-fade-in">{validationMsg}</p>
      )}

      <button
        onClick={() => onExecute(side, qty)}
        disabled={disabled}
        className={cn(
          "w-full h-12 rounded-xl font-extrabold text-white shadow-sm transition-all flex items-center justify-center gap-2",
          "hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0",
          side === "buy" ? "bg-up" : "bg-down"
        )}
      >
        {placing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : side === "buy" ? (
          <TrendingUp className="w-5 h-5" />
        ) : (
          <TrendingDown className="w-5 h-5" />
        )}
        {placing ? "Placing…" : `${side === "buy" ? "Buy" : "Sell"} ${qty} ${symbol}`}
      </button>
    </div>
  );
};

const Row = ({ label, value, bold, className }: { label: string; value: string; bold?: boolean; className?: string }) => (
  <div className="flex items-center justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className={cn("tabular-nums", bold ? "font-bold" : "font-medium", className)}>{value}</span>
  </div>
);
