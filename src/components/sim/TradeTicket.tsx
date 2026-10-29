import { useEffect, useMemo, useState } from "react";
import { formatNumber } from "@/lib/yahoo";
import { cn } from "@/lib/utils";
import { Loader2, TrendingUp, TrendingDown, Wallet, ChevronDown, Clock, Info, ArrowDownRight, ArrowUpRight } from "lucide-react";

interface Props {
  symbol: string;
  price?: number;
  /** Actual cash: starting cash + realized gains − what's invested. Negative while borrowing. */
  cash: number;
  /** The most a buy may cost (with leverage, up to leverage × net worth in stocks). Defaults to cash. */
  spendable?: number;
  /** Caps covers. Defaults to spendable. */
  coverPower?: number;
  /** The game's leverage (1 = no borrowing). */
  leverage?: number;
  /** Total remaining margin capacity (starting cash × leverage − deployed). Caps shorts. */
  shortPower?: number;
  /** Shares currently held of this symbol (0 if none). Negative = short. */
  heldShares: number;
  allowShort?: boolean;
  placing: boolean;
  /** Orders can only be placed during the regular session. */
  marketOpen?: boolean;
  /** Label describing when a queued order will fill, e.g. "today at 9:30am ET". */
  nextOpen?: string;
  onExecute: (side: "buy" | "sell" | "short" | "cover", shares: number, atOpen: boolean) => void;
}

export const TradeTicket = ({
  symbol,
  price,
  cash,
  spendable,
  coverPower,
  leverage = 1,
  shortPower,
  heldShares,
  allowShort = false,
  placing,
  marketOpen = false,
  nextOpen = "the next open",
  onExecute,
}: Props) => {
  const [side, setSide] = useState<"buy" | "sell" | "short" | "cover">("buy");
  // The box's text as typed, so it can be cleared to type a new number; the
  // slider and % buttons write whole numbers into it.
  const [qtyText, setQtyText] = useState("1");
  const setQty = (n: number) => setQtyText(String(n));
  const emptyQty = qtyText.trim() === "";
  const qty = emptyQty ? 0 : Number(qtyText);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // The most this order may cost: buys can go past your cash up to leverage ×
  // your cash; covers and shorts draw on margin capacity.
  const tradingPower = Math.max(
    0,
    side === "short" ? shortPower ?? 0 : side === "cover" ? coverPower ?? spendable ?? cash : spendable ?? cash,
  );
  // What the slider and % buttons size against: everything this order may use.
  // For buys that's your buying power, so 100% with 2× leverage and $100k in
  // cash spends $200k, half of it borrowed.
  const budget = tradingPower;
  const leveraged = leverage > 1;

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
    if (!price || price <= 0) return 0;
    return Math.max(0, Math.floor(budget / price));
  }, [side, price, budget, heldShares]);

  // Share of the relevant budget already committed to this symbol (0–1).
  const investedFraction = useMemo(() => {
    if (!price || price <= 0) return 0;
    const committed = Math.abs(heldShares) * price;
    const pool = budget + committed;
    return pool > 0 ? committed / pool : 0;
  }, [price, heldShares, budget]);


  const estCost = price ? price * qty : 0;
  // Leveraged buys: the part of the bar past your own cash is borrowed money.
  const borrowZone = side === "buy" && leveraged && !!price && maxShares > 0;
  const cashShares = price ? Math.floor(Math.max(0, cash) / price) : 0;
  const cashMark = borrowZone ? Math.min(100, (cashShares / maxShares) * 100) : 100;
  const borrowed = side === "buy" ? Math.max(0, estCost - Math.max(0, cash)) : 0;
  const pctOfMax = maxShares > 0 ? Math.min(100, Math.round((qty / maxShares) * 100)) : 0;
  const pctOf = side === "sell" ? "your shares" : side === "cover" ? "your short" : side === "buy" && !leveraged ? "your cash" : "buying power";

  const insufficient = (side === "buy" || side === "cover") && estCost > tradingPower;
  const overSell = side === "sell" && qty > heldShares;
  const overCover = side === "cover" && qty > Math.abs(Math.min(heldShares, 0));
  const invalidQty = !Number.isInteger(qty) || qty < 1;
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
    ? emptyQty
      ? null
      : "Enter a whole number of shares."
    : insufficient
    ? `${qty === 1 ? "1 share" : `${qty.toLocaleString()} shares`} of ${symbol} ${qty === 1 ? "costs" : "cost"} $${formatNumber(estCost)}, but you only have $${formatNumber(tradingPower)} ${leveraged ? "of buying power" : "in cash"}.${maxShares >= 1 ? " Try fewer shares." : " Sell some stock to free up cash."}`
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
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1 tabular-nums shrink-0" title="Your cash">
          <Wallet className="w-3.5 h-3.5" /> {cash < 0 ? "−" : ""}${formatNumber(Math.abs(cash))} cash
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
          inputMode="numeric"
          min={1}
          step={1}
          value={qtyText}
          onChange={(e) => setQtyText(e.target.value)}
          aria-label="Number of shares"
          className={cn(
            "flex-1 h-12 px-4 rounded-2xl bg-muted/60 border-2 outline-none text-base font-bold tabular-nums transition-colors focus:bg-card",
            validationMsg ? "border-rose-400 focus:border-rose-500" : "border-transparent focus:border-primary/50",
          )}
        />
      </div>

      {/* Drag slider — 1 → max shares (for leveraged buys, the shaded part is borrowed) */}
      <div className="mb-3">
        {maxShares >= 1 && (
          <div className="flex justify-between text-[11px] font-bold tabular-nums mb-1.5">
            <span className="text-foreground">
              {pctOfMax}% of {pctOf}
            </span>
            {borrowed > 0 && <span className="text-amber-700 dark:text-amber-400">${formatNumber(borrowed)} borrowed</span>}
          </div>
        )}
        <input
          type="range"
          min={1}
          max={Math.max(1, maxShares)}
          step={1}
          value={Math.min(Math.max(1, qty || 1), Math.max(1, maxShares))}
          disabled={maxShares < 1}
          onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
          aria-label="Shares"
          style={
            borrowZone
              ? { background: `linear-gradient(to right, hsl(var(--muted)) ${cashMark}%, rgb(252 211 77 / 0.75) ${cashMark}%)` }
              : undefined
          }
          className="w-full h-2 appearance-none rounded-full bg-muted accent-primary cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        />
        <div className="relative flex justify-between text-[10px] font-bold text-muted-foreground mt-1 tabular-nums">
          <span>1</span>
          {borrowZone && cashMark > 12 && cashMark < 88 && (
            <span className="absolute -translate-x-1/2 text-amber-700 dark:text-amber-400" style={{ left: `${cashMark}%` }}>
              ▲ your cash
            </span>
          )}
          <span>{maxShares.toLocaleString()} max</span>
        </div>
      </div>

      <div className="flex gap-1.5 mb-2">
        {[0.25, 0.5, 0.75, 1].map((f) => {
          const target = Math.floor(maxShares * f);
          // Greyed out once you've already committed this much of your buying
          // power to this symbol, or when there aren't enough shares available.
          const alreadyCommitted = (side === "buy" || side === "short") && investedFraction >= f - 0.0001;
          const off = target < 1 || alreadyCommitted;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setQty(Math.max(1, target))}
              disabled={off}
              title={alreadyCommitted ? "You've already invested this much here" : undefined}
              className={cn(
                "flex-1 py-2 rounded-lg text-[11px] font-extrabold transition-colors",
                off
                  ? "bg-muted/40 text-muted-foreground/50 cursor-not-allowed"
                  : "bg-muted/60 hover:bg-accent",
              )}
            >
              {f === 1 ? "100%" : `${f * 100}%`}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground mb-4">
        {side === "buy"
          ? leveraged
            ? `Percent of your buying power. With ${leverage}× leverage you can own stocks worth up to ${leverage}× your net worth; the shaded part of the bar is borrowed.`
            : "Percent of your cash. 100% invests it all."
          : "Percent of your available buying power. 100% invests it all."}
      </p>


      {/* Estimate */}
      <div className="rounded-2xl bg-muted/40 border p-3.5 space-y-2 text-sm mb-4">
        <Row label="Price per share" value={price ? `$${formatNumber(price)}` : "—"} />
        <Row label="Shares" value={invalidQty ? "—" : qty.toLocaleString()} />
        <Row
          label={side === "buy" ? "Total cost" : "You'll receive"}
          value={price ? `$${formatNumber(estCost)}` : "—"}
          bold
        />
        {leveraged && side === "buy" && (
          <Row label={`Buying power (${leverage}× leverage)`} value={`$${formatNumber(tradingPower)}`} />
        )}
        {leveraged && side === "buy" && !!price && estCost > Math.max(0, cash) && (
          <Row
            label="Paid with borrowed money"
            value={`$${formatNumber(estCost - Math.max(0, cash))}`}
            className="text-amber-700 dark:text-amber-400"
          />
        )}
      </div>

      {!marketOpen && (
        <div className="rounded-2xl border-2 border-dashed bg-muted/30 p-3 mb-3 flex items-start gap-2">
          <Clock className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            The market is closed. This will be queued as a{" "}
            <span className="font-bold text-foreground">market-on-open</span> order and fills{" "}
            <span className="font-bold text-foreground">{nextOpen}</span> at whatever the price is then.
          </p>
        </div>
      )}

      {validationMsg && (
        <p className="text-xs font-bold text-rose-600 mb-3 animate-fade-in">{validationMsg}</p>
      )}

      <button
        onClick={() => onExecute(side, qty, !marketOpen)}
        disabled={disabled}
        className={cn(
          "w-full h-14 rounded-2xl font-extrabold text-base shadow-sm transition-all flex items-center justify-center gap-2",
          "hover:brightness-105 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0",
          s.on,
        )}
      >
        {placing ? <Loader2 className="w-5 h-5 animate-spin" /> : s.icon}
        {placing
          ? "Placing…"
          : invalidQty
          ? `${s.label}`
          : marketOpen
          ? `${s.label} ${qty.toLocaleString()} ${qty === 1 ? "share" : "shares"}`
          : `${s.label} at open`}
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
