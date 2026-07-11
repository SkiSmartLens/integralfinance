import { useEffect, useMemo, useState } from "react";
import { formatNumber } from "@/lib/yahoo";
import { cn } from "@/lib/utils";
import { Loader2, TrendingUp, TrendingDown, Wallet, ChevronDown, Info, ArrowDownRight, ArrowUpRight } from "lucide-react";

interface Props {
  symbol: string;
  price?: number;
  cash: number;
  /** Shares currently held of this symbol (0 if none). Negative = short. */
  heldShares: number;
  allowShort?: boolean;
  placing: boolean;
  onExecute: (side: "buy" | "sell" | "short" | "cover", shares: number) => void;
}

export const TradeTicket = ({
  symbol,
  price,
  cash,
  heldShares,
  allowShort = false,
  placing,
  onExecute,
}: Props) => {
  const [side, setSide] = useState<"buy" | "sell" | "short" | "cover">("buy");
  const [qty, setQty] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    // Auto-correct when the user's position no longer matches the picked side.
    if (heldShares <= 0 && side === "sell") setSide("buy");
    if (heldShares >= 0 && side === "cover") setSide("buy");
    if (heldShares < 0 && side === "buy") setSide("cover");
    if (heldShares < 0 && side === "sell") setSide("cover");
  }, [heldShares, side]);

  const maxShares = useMemo(() => {
    if (side === "sell") return Math.max(0, heldShares);
    if (side === "cover") return Math.max(0, Math.abs(Math.min(heldShares, 0)));
    // buy / short both consume buying power
    if (!price || price <= 0) return 0;
    return Math.max(0, Math.floor(cash / price));
  }, [side, price, cash, heldShares]);

  const estCost = price ? price * qty : 0;
  const insufficient = (side === "buy" || side === "cover") && estCost > cash;
  const overSell = side === "sell" && qty > heldShares;
  const overCover = side === "cover" && qty > Math.abs(Math.min(heldShares, 0));
  const invalidQty = !Number.isFinite(qty) || qty < 1;
  const disabled =
    placing ||
    invalidQty ||
    insufficient ||
    overSell ||
    overCover ||
    !price ||
    (side === "sell" && heldShares <= 0) ||
    (side === "cover" && heldShares >= 0) ||
    (side === "short" && heldShares > 0);

  const validationMsg = invalidQty
    ? "Enter a whole number of shares."
    : insufficient
    ? "Not enough cash for this order."
    : overSell
    ? `You only hold ${heldShares} shares.`
    : overCover
    ? `You are only short ${Math.abs(heldShares)} shares.`
    : null;

  const sides: { key: "buy" | "sell" | "short" | "cover"; label: string; disabled: boolean }[] = [
    { key: "buy", label: "Buy", disabled: heldShares < 0 },
    { key: "sell", label: "Sell", disabled: heldShares <= 0 },
    ...(allowShort
      ? ([
          { key: "short" as const, label: "Short", disabled: heldShares > 0 },
          { key: "cover" as const, label: "Cover", disabled: heldShares >= 0 },
        ])
      : []),
  ];

  const sideStyles: Record<typeof side, { on: string; label: string; icon: JSX.Element }> = {
    buy: {
      on: "bg-emerald-500 text-white shadow-md shadow-emerald-500/30",
      label: "Buy",
      icon: <TrendingUp className="w-5 h-5" />,
    },
    sell: {
      on: "bg-rose-300 text-rose-900 shadow-md shadow-rose-300/40",
      label: "Sell",
      icon: <TrendingDown className="w-5 h-5" />,
    },
    short: {
      on: "bg-rose-500 text-white shadow-md shadow-rose-500/30",
      label: "Short",
      icon: <ArrowDownRight className="w-5 h-5" />,
    },
    cover: {
      on: "bg-emerald-300 text-emerald-900 shadow-md shadow-emerald-300/40",
      label: "Cover",
      icon: <ArrowUpRight className="w-5 h-5" />,
    },
  };
  const s = sideStyles[side];

  return (
    <div className="rounded-3xl border-2 bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-extrabold text-lg">Trade {symbol}</h3>
          <p className="text-xs text-muted-foreground">Simple market order — nothing scary.</p>
        </div>
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1 tabular-nums">
          <Wallet className="w-3.5 h-3.5" /> ${formatNumber(cash)}
        </span>
      </div>

      {/* Side toggle — Buy/Sell (and Short/Cover if enabled) all live at the top level. */}
      <div
        className={cn(
          "grid gap-2 p-1.5 bg-muted/50 rounded-2xl mb-4",
          sides.length === 4 ? "grid-cols-4" : "grid-cols-2",
        )}
      >
        {sides.map((opt) => (
          <button
            key={opt.key}
            type="button"
            disabled={opt.disabled}
            onClick={() => setSide(opt.key)}
            className={cn(
              "py-2.5 rounded-xl text-sm font-extrabold capitalize transition-all",
              side === opt.key ? sideStyles[opt.key].on : "text-muted-foreground hover:text-foreground",
              opt.disabled && "opacity-40 cursor-not-allowed",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Quantity */}
      <label className="block text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-2">
        How many shares?
      </label>
      <div className="flex items-center gap-2 mb-2">
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
          className={cn(
            "flex-1 h-12 px-4 rounded-2xl bg-muted/60 border-2 outline-none text-base font-bold tabular-nums transition-colors focus:bg-card",
            validationMsg ? "border-rose-400 focus:border-rose-500" : "border-transparent focus:border-primary/50",
          )}
        />
        <button
          type="button"
          onClick={() => setQty(Math.max(1, maxShares))}
          disabled={maxShares < 1}
          className="h-12 px-4 rounded-2xl bg-muted text-xs font-extrabold uppercase hover:bg-accent transition-colors disabled:opacity-40"
        >
          Max
        </button>
      </div>
      <div className="flex gap-1.5 mb-4">
        {[0.25, 0.5, 0.75].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setQty(Math.max(1, Math.floor(maxShares * f)))}
            disabled={maxShares < 1}
            className="flex-1 py-1.5 rounded-lg bg-muted/60 text-[11px] font-extrabold hover:bg-accent transition-colors disabled:opacity-40"
          >
            {f * 100}%
          </button>
        ))}
      </div>

      {/* Estimate */}
      <div className="rounded-2xl bg-muted/40 border p-3.5 space-y-2 text-sm mb-4">
        <Row label="Price per share" value={price ? `$${formatNumber(price)}` : "—"} />
        <Row label="Shares" value={qty.toLocaleString()} />
        <Row
          label={side === "buy" ? "Total cost" : "You'll receive"}
          value={price ? `$${formatNumber(estCost)}` : "—"}
          bold
        />
      </div>

      {validationMsg && (
        <p className="text-xs font-bold text-rose-600 mb-3 animate-fade-in">{validationMsg}</p>
      )}

      <button
        onClick={() => onExecute(side, qty)}
        disabled={disabled}
        className={cn(
          "w-full h-14 rounded-2xl font-extrabold text-base shadow-sm transition-all flex items-center justify-center gap-2",
          "hover:brightness-105 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0",
          s.on,
        )}
      >
        {placing ? <Loader2 className="w-5 h-5 animate-spin" /> : s.icon}
        {placing ? "Placing…" : `${s.label} ${qty} ${qty === 1 ? "share" : "shares"}`}
      </button>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showAdvanced && "rotate-180")} />
        {showAdvanced ? "Hide order info" : "How this order works"}
      </button>
      {showAdvanced && (
        <div className="mt-3 rounded-2xl bg-muted/30 border p-3.5 space-y-3 animate-fade-in">
          <div className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p>
              You're placing a <span className="font-bold text-foreground">market order</span> — it fills instantly at the
              current price. Limit and stop orders coming soon.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const Row = ({
  label,
  value,
  bold,
  className,
}: {
  label: string;
  value: string;
  bold?: boolean;
  className?: string;
}) => (
  <div className="flex items-center justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className={cn("tabular-nums", bold ? "font-extrabold text-base" : "font-semibold", className)}>{value}</span>
  </div>
);
