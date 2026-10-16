import { useEffect, useState } from "react";
import { supabase } from "@/lib/backend";

// Admin controls for the simulator, as database functions installed by
// supabase/migrations/20261016190000_sim_ledger_cash_admin_rpcs.sql (pasted
// into Lovable's SQL editor). Each one re-checks that the caller is an admin.
// They aren't in the generated Supabase types, hence the untyped rpc call.

export const NOT_INSTALLED =
  "The admin database functions aren't installed yet. Paste the simulator SQL into Lovable's SQL editor and run it.";

type Result<T> = { data?: T; error?: string };

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<Result<T>> {
  const { data, error } = await (supabase as unknown as {
    rpc: (n: string, a: Record<string, unknown>) => Promise<{ data: T; error: { code?: string; message: string } | null }>;
  }).rpc(name, args);
  if (error) {
    const missing = error.code === "PGRST202" || /could not find the function/i.test(error.message);
    return { error: missing ? NOT_INSTALLED : error.message };
  }
  return { data };
}

export const simAdmin = {
  setCash: (memberId: string, cash: number) => rpc<number>("admin_set_cash", { _member_id: memberId, _cash: cash }),
  /** holdingsValue: the player's stocks at live prices — the database has no prices. */
  setNetWorth: (memberId: string, netWorth: number, holdingsValue: number) =>
    rpc<number>("admin_set_net_worth", { _member_id: memberId, _net_worth: netWorth, _holdings_value: holdingsValue }),
  /** charge: pay with their cash at `price` (net worth unchanged); false = free. */
  setPosition: (memberId: string, symbol: string, shares: number, price: number, charge: boolean) =>
    rpc<{ symbol: string; shares: number; price: number }>("admin_set_position", {
      _member_id: memberId,
      _symbol: symbol,
      _shares: shares,
      _price: price,
      _charge: charge,
    }),
  reset: (memberId: string) => rpc<number>("admin_reset_member", { _member_id: memberId }),
  remove: (memberId: string) => rpc<null>("admin_remove_member", { _member_id: memberId }),
  updateGame: (gameId: string, changes: Record<string, unknown>) =>
    rpc<null>("admin_update_game", { _game_id: gameId, _changes: changes }),
  deleteGame: (gameId: string) => rpc<number>("admin_delete_game", { _game_id: gameId }),
  syncAll: () => rpc<number>("admin_sync_all_cash", {}),
};

let syncedPromise: Promise<boolean> | null = null;

/**
 * True once the database keeps every player's stored cash equal to their
 * trade history (the SQL above is installed). Until then stored cash can't be
 * trusted for other players. Checked once per page load.
 */
export function cashSynced(): Promise<boolean> {
  syncedPromise ??= rpc<boolean>("sim_cash_synced", {}).then((r) => r.data === true);
  return syncedPromise;
}

export function useCashSynced(): boolean {
  const [synced, setSynced] = useState(false);
  useEffect(() => {
    let alive = true;
    cashSynced().then((v) => alive && setSynced(v));
    return () => {
      alive = false;
    };
  }, []);
  return synced;
}
