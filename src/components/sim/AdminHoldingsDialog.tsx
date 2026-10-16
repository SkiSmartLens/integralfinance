import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/backend";
import { toast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/yahoo";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface AdminHoldingsPlayer {
  member_id: string;
  name: string;
  cash: number;
  positions: { symbol: string; shares: number; avgCost: number }[];
}

/**
 * Admin-only editor for another player's holdings. Every change goes through
 * the admin-set-cash edge function, which runs it through the trading engine
 * so it lands in their trade history (and so in their net worth).
 */
export const AdminHoldingsDialog = ({
  player,
  priceMap,
  onClose,
  onChanged,
}: {
  player: AdminHoldingsPlayer | null;
  priceMap: Map<string, number>;
  onClose: () => void;
  onChanged: () => void;
}) => {
  const [charge, setCharge] = useState(true);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [newSymbol, setNewSymbol] = useState("");
  const [newShares, setNewShares] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  // Reset the share inputs whenever the dialog opens or their holdings change.
  const positionsKey = player?.positions.map((p) => `${p.symbol}:${p.shares}`).join(",") ?? "";
  useEffect(() => {
    setDraft(Object.fromEntries((player?.positions ?? []).map((p) => [p.symbol, String(p.shares)])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.member_id, positionsKey]);

  const setShares = async (symbol: string, sharesText: string) => {
    if (!player) return;
    const sym = symbol.trim().toUpperCase();
    const shares = Number(sharesText);
    if (!sym) return toast({ title: "Enter a ticker symbol", variant: "destructive" });
    if (sharesText.trim() === "" || !Number.isFinite(shares) || shares < 0) {
      return toast({ title: "Shares must be zero or more", variant: "destructive" });
    }
    setBusy(sym);
    const { data, error } = await supabase.functions.invoke<{ error?: string; price?: number }>("admin-set-cash", {
      body: { action: "set_position", member_id: player.member_id, symbol: sym, shares, charge },
    });
    setBusy(null);
    let reason = data?.error ?? (error ? error.message : null);
    if (error) {
      // functions.invoke returns a generic "non-2xx" message — read the real reason.
      try {
        const body = await (error as { context?: { json?: () => Promise<{ error?: string }> } }).context?.json?.();
        if (body?.error) reason = body.error;
      } catch { /* keep generic message */ }
    }
    if (reason) return toast({ title: `Couldn't update ${sym}`, description: reason, variant: "destructive" });
    toast({
      title: `${player.name} now has ${formatNumber(shares)} ${sym}`,
      description: data?.price ? `At $${formatNumber(data.price)} a share${charge ? ", paid from their cash" : ", free"}.` : undefined,
    });
    if (symbol === newSymbol) {
      setNewSymbol("");
      setNewShares("");
    }
    onChanged();
  };

  const holdingsValue = (player?.positions ?? []).reduce(
    (s, p) => s + (priceMap.get(p.symbol) ?? p.avgCost) * p.shares,
    0,
  );

  return (
    <Dialog open={!!player} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        {player && (
          <>
            <DialogHeader>
              <DialogTitle>Edit {player.name}'s stocks</DialogTitle>
              <DialogDescription>
                ${formatNumber(player.cash)} cash · ${formatNumber(player.cash + holdingsValue)} net worth
              </DialogDescription>
            </DialogHeader>

            <label className="flex items-start gap-2.5 rounded-xl border bg-muted/30 p-3 text-sm cursor-pointer">
              <Checkbox checked={charge} onCheckedChange={(v) => setCharge(v === true)} className="mt-0.5" />
              <span>
                <span className="font-bold">Pay with their cash at the live price</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {charge
                    ? "Like a real trade: adding shares spends their cash, removing shares gives cash back. Net worth stays the same."
                    : "Free: shares are given or taken away without touching their cash, so their net worth changes."}
                </span>
              </span>
            </label>

            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                    <th className="text-left font-semibold px-2 py-2">Symbol</th>
                    <th className="text-left font-semibold px-2">Shares</th>
                    <th className="text-right font-semibold px-2">Value</th>
                    <th className="px-2" />
                  </tr>
                </thead>
                <tbody>
                  {player.positions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-2 py-4 text-center text-muted-foreground">
                        No stocks yet.
                      </td>
                    </tr>
                  )}
                  {player.positions.map((p) => {
                    const price = priceMap.get(p.symbol) ?? p.avgCost;
                    const changed = draft[p.symbol] !== undefined && Number(draft[p.symbol]) !== p.shares;
                    return (
                      <tr key={p.symbol} className="border-b last:border-0">
                        <td className="px-2 py-2 font-bold">{p.symbol}</td>
                        <td className="px-2">
                          <input
                            type="number"
                            min={0}
                            step={1}
                            inputMode="numeric"
                            aria-label={`${p.symbol} shares`}
                            value={draft[p.symbol] ?? ""}
                            onChange={(e) => setDraft((d) => ({ ...d, [p.symbol]: e.target.value }))}
                            className="h-8 w-24 rounded-lg border bg-background px-2 tabular-nums"
                          />
                        </td>
                        <td className="px-2 text-right tabular-nums">${formatNumber(price * p.shares)}</td>
                        <td className="px-2">
                          <div className="flex items-center justify-end gap-1">
                            {busy === p.symbol ? (
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            ) : (
                              <>
                                <button
                                  type="button"
                                  disabled={!changed || !!busy}
                                  onClick={() => setShares(p.symbol, draft[p.symbol] ?? "")}
                                  className="h-8 px-2.5 rounded-lg border-2 text-xs font-bold hover:border-primary disabled:opacity-40"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  disabled={!!busy}
                                  onClick={() => setShares(p.symbol, "0")}
                                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-muted flex items-center justify-center disabled:opacity-40"
                                  title={`Remove all ${p.symbol}`}
                                  aria-label={`Remove all ${p.symbol}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setShares(newSymbol, newShares);
              }}
            >
              <input
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                placeholder="Ticker, e.g. NVDA"
                aria-label="Ticker to add"
                className="h-9 flex-1 min-w-[8rem] rounded-lg border bg-background px-2.5 text-sm uppercase"
              />
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={newShares}
                onChange={(e) => setNewShares(e.target.value)}
                placeholder="Shares"
                aria-label="Shares to hold"
                className="h-9 w-24 rounded-lg border bg-background px-2.5 text-sm tabular-nums"
              />
              <button
                type="submit"
                disabled={!!busy || !newSymbol.trim() || !newShares.trim()}
                className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-40"
              >
                {busy && busy === newSymbol.trim().toUpperCase() ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Set
              </button>
            </form>
            <p className="text-xs text-muted-foreground -mt-2">
              Sets their total shares of that stock. If they already hold it, this replaces the amount.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
