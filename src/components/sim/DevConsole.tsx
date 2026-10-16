import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Copy, Loader2, RefreshCw, Trash2, UserMinus, X } from "lucide-react";
import { supabase } from "@/lib/backend";
import { toast } from "@/hooks/use-toast";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { formatNumber } from "@/lib/yahoo";
import { cn } from "@/lib/utils";
import { estimatedNetWorth } from "@/lib/simLedger";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { AdminHoldingsDialog } from "./AdminHoldingsDialog";

/** Must match BUILD in the place-order, admin-set-cash and join-game edge functions. */
const EXPECTED_BUILD = "2026-10-16-dev";

const DEPLOY_REQUEST = `Please deploy the Supabase edge functions place-order, admin-set-cash and join-game exactly as they are in the repo, without changing their code. Afterwards, a POST to each with no signed-in user should return JSON that includes "build": "${EXPECTED_BUILD}".`;

interface GameRow {
  id: string;
  name: string;
  starting_cash: number;
  leverage: number;
  allow_short: boolean;
  is_public: boolean;
  min_price: number | null;
  max_position_pct: number | null;
  ends_at: string | null;
  join_code: string;
}

interface PlayerRow {
  member_id: string;
  name: string;
  cash: number;
  net_worth: number;
  positions: { symbol: string; shares: number; avg_cost: number; last: number }[];
}

type CallResult<T> = { data?: T; error?: string; notDeployed?: boolean };

/** Calls an edge function and turns every failure into a readable message. */
async function callFn<T>(fn: string, body: Record<string, unknown>): Promise<CallResult<T>> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx?.status === 404) return { notDeployed: true, error: `The ${fn} server function isn't deployed yet.` };
    try {
      const parsed = await ctx?.json?.();
      if (parsed?.error) return { error: String(parsed.error) };
    } catch { /* keep generic message */ }
    return { error: error.message };
  }
  if ((data as { error?: string } | null)?.error) return { error: (data as { error: string }).error };
  return { data: data as T };
}

const money = (n: number) => `${n < 0 ? "−" : ""}$${formatNumber(Math.abs(n))}`;

/**
 * Admin-only control panel inside the simulator: every player's exact net
 * worth, and controls to set net worth, cash or stocks, reset or remove a
 * player, change any game's settings, delete games, and run housekeeping.
 * All writes go through the admin-set-cash edge function, which re-checks
 * the caller is an admin.
 */
export const DevConsole = ({
  open,
  onOpenChange,
  currentGameId,
  onChanged,
  onGameDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentGameId?: string;
  /** Something about the current game changed — reload it. */
  onChanged: () => void;
  /** The current game was deleted. */
  onGameDeleted: () => void;
}) => {
  const [games, setGames] = useState<GameRow[]>([]);
  const [gameId, setGameId] = useState<string | undefined>(currentGameId);
  const [players, setPlayers] = useState<PlayerRow[] | null>(null);
  const [exact, setExact] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ memberId: string; field: "net_worth" | "cash"; value: string } | null>(null);
  const [stocksFor, setStocksFor] = useState<string | null>(null);

  useEffect(() => {
    if (open && currentGameId && !gameId) setGameId(currentGameId);
  }, [open, currentGameId, gameId]);

  const loadGames = useCallback(async () => {
    const { data } = await supabase.from("games").select("*").order("created_at", { ascending: false });
    setGames((data ?? []) as GameRow[]);
  }, []);

  // Exact figures from the server when the admin function is deployed;
  // otherwise an estimate from what an admin can read directly.
  const [fallback, setFallback] = useState<{ member_id: string; name: string; cash: number; positions: { symbol: string; shares: number; avg_cost: number }[] }[]>([]);
  const loadPlayers = useCallback(async () => {
    if (!gameId) return;
    setLoading(true);
    const r = await callFn<{ players: PlayerRow[] }>("admin-set-cash", { action: "player_summaries", game_id: gameId });
    if (r.data?.players) {
      setPlayers(r.data.players);
      setExact(true);
      setFallback([]);
    } else {
      const { data: members } = await supabase.from("game_members").select("id, user_id, cash").eq("game_id", gameId);
      const ids = (members ?? []).map((m) => m.id);
      const [{ data: pos }, { data: profs }] = await Promise.all([
        ids.length
          ? supabase.from("positions").select("member_id, symbol, shares, avg_cost").in("member_id", ids)
          : Promise.resolve({ data: [] as { member_id: string; symbol: string; shares: number; avg_cost: number }[] }),
        supabase.from("profiles").select("user_id, display_name").in("user_id", (members ?? []).map((m) => m.user_id)),
      ]);
      const names = new Map((profs ?? []).map((p) => [p.user_id, p.display_name as string]));
      setFallback(
        (members ?? []).map((m) => ({
          member_id: m.id,
          name: names.get(m.user_id) ?? "Player",
          cash: Number(m.cash),
          positions: (pos ?? [])
            .filter((p) => p.member_id === m.id)
            .map((p) => ({ symbol: p.symbol, shares: Number(p.shares), avg_cost: Number(p.avg_cost) })),
        })),
      );
      setPlayers(null);
      setExact(false);
    }
    setLoading(false);
  }, [gameId]);

  useEffect(() => {
    if (!open) return;
    loadGames();
  }, [open, loadGames]);
  useEffect(() => {
    if (open) loadPlayers();
  }, [open, loadPlayers]);

  const game = games.find((g) => g.id === gameId);
  const startingCash = Number(game?.starting_cash ?? 0);

  const fallbackSymbols = useMemo(
    () => [...new Set(fallback.flatMap((p) => p.positions.map((x) => x.symbol)))],
    [fallback],
  );
  const { quotes } = useLiveQuotes(fallbackSymbols, 15000);
  const quoteMap = useMemo(() => new Map(quotes.map((q) => [q.symbol, q.regularMarketPrice ?? 0])), [quotes]);

  const rows: PlayerRow[] = useMemo(() => {
    if (players) return players;
    return fallback.map((p) => {
      const priced = p.positions.map((x) => ({ ...x, last: quoteMap.get(x.symbol) || x.avg_cost }));
      const netWorth = estimatedNetWorth(
        startingCash,
        p.cash,
        priced.map((x) => ({ shares: x.shares, avgCost: x.avg_cost, last: x.last })),
      );
      const holdings = priced.reduce((s, x) => s + x.last * x.shares, 0);
      return { member_id: p.member_id, name: p.name, cash: netWorth - holdings, net_worth: netWorth, positions: priced };
    });
  }, [players, fallback, quoteMap, startingCash]);

  const afterChange = async () => {
    await loadPlayers();
    if (gameId === currentGameId) onChanged();
  };

  const run = async (key: string, body: Record<string, unknown>, success: string) => {
    setBusy(key);
    const r = await callFn<Record<string, unknown>>("admin-set-cash", body);
    setBusy(null);
    if (r.error) {
      toast({ title: "Didn't work", description: r.error, variant: "destructive" });
      return false;
    }
    toast({ title: success });
    await afterChange();
    return true;
  };

  const saveEdit = async () => {
    if (!editing) return;
    const amount = Number(editing.value.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(amount)) return toast({ title: "Enter a number", variant: "destructive" });
    const player = rows.find((p) => p.member_id === editing.memberId);
    const ok =
      editing.field === "net_worth"
        ? await run(`nw:${editing.memberId}`, { action: "set_net_worth", member_id: editing.memberId, net_worth: amount }, `${player?.name ?? "Player"}'s net worth set to ${money(amount)}`)
        : await run(`cash:${editing.memberId}`, { member_id: editing.memberId, cash: amount }, `${player?.name ?? "Player"}'s cash set to ${money(amount)}`);
    if (ok) setEditing(null);
  };

  const stocksPlayer = rows.find((p) => p.member_id === stocksFor);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Dev console</SheetTitle>
          <SheetDescription>Admin controls for every game. Only admins can see this.</SheetDescription>
        </SheetHeader>

        <label className="block mt-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Game
          <select
            value={gameId ?? ""}
            onChange={(e) => {
              setGameId(e.target.value);
              setEditing(null);
            }}
            className="mt-1 w-full h-10 rounded-xl border bg-background px-3 text-sm font-semibold normal-case tracking-normal text-foreground"
          >
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
                {g.id === currentGameId ? " (this game)" : ""} · {g.join_code}
              </option>
            ))}
          </select>
        </label>

        <Tabs defaultValue="players" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="game">Game</TabsTrigger>
            <TabsTrigger value="server">Server</TabsTrigger>
          </TabsList>

          {/* ---------------- Players ---------------- */}
          <TabsContent value="players" className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {rows.length} player{rows.length === 1 ? "" : "s"} ·{" "}
                {exact ? "exact figures from trade history" : "estimated (admin server function not deployed)"}
              </span>
              <button
                type="button"
                onClick={loadPlayers}
                className="inline-flex items-center gap-1 hover:text-foreground"
                aria-label="Refresh players"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
              </button>
            </div>

            {rows.length === 0 && !loading && <p className="text-sm text-muted-foreground py-6 text-center">No players.</p>}

            {rows.map((p) => {
              const isEditing = editing?.memberId === p.member_id;
              return (
                <div key={p.member_id} className="rounded-2xl border bg-card p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-extrabold truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        {money(p.cash)} cash ·{" "}
                        {p.positions.length
                          ? p.positions.map((x) => `${x.symbol} ${formatNumber(x.shares)}`).join(", ")
                          : "no stocks"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold tabular-nums">{money(p.net_worth)}</div>
                      <div
                        className={cn(
                          "text-[11px] font-bold tabular-nums",
                          p.net_worth >= startingCash ? "text-emerald-600" : "text-rose-600",
                        )}
                      >
                        {p.net_worth >= startingCash ? "+" : "−"}
                        {money(Math.abs(p.net_worth - startingCash)).replace("−", "")}
                      </div>
                    </div>
                  </div>

                  {isEditing ? (
                    <form
                      className="mt-3 flex items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveEdit();
                      }}
                    >
                      <span className="text-xs font-bold text-muted-foreground shrink-0">
                        {editing.field === "net_worth" ? "Net worth" : "Cash"} $
                      </span>
                      <input
                        autoFocus
                        inputMode="decimal"
                        value={editing.value}
                        onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                        className="h-9 flex-1 min-w-0 rounded-lg border bg-background px-2.5 text-sm tabular-nums"
                        aria-label={editing.field === "net_worth" ? "New net worth" : "New cash"}
                      />
                      <button
                        type="submit"
                        disabled={!!busy}
                        className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
                        aria-label="Save"
                      >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="h-9 w-9 rounded-lg border flex items-center justify-center text-muted-foreground"
                        aria-label="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </form>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <ActionButton
                        onClick={() => setEditing({ memberId: p.member_id, field: "net_worth", value: String(Math.round(p.net_worth * 100) / 100) })}
                      >
                        Set net worth
                      </ActionButton>
                      <ActionButton
                        onClick={() => setEditing({ memberId: p.member_id, field: "cash", value: String(Math.round(p.cash * 100) / 100) })}
                      >
                        Set cash
                      </ActionButton>
                      <ActionButton onClick={() => setStocksFor(p.member_id)}>Stocks</ActionButton>
                      <ActionButton
                        busy={busy === `reset:${p.member_id}`}
                        onClick={() => {
                          if (!confirm(`Reset ${p.name} to ${money(startingCash)} with no stocks and no trade history?`)) return;
                          run(`reset:${p.member_id}`, { action: "reset", member_id: p.member_id }, `${p.name} reset`);
                        }}
                      >
                        Reset
                      </ActionButton>
                      <ActionButton
                        danger
                        busy={busy === `remove:${p.member_id}`}
                        onClick={() => {
                          if (!confirm(`Remove ${p.name} from ${game?.name ?? "this game"}? Their stocks and history in it are deleted.`)) return;
                          run(`remove:${p.member_id}`, { action: "remove_member", member_id: p.member_id }, `${p.name} removed`);
                        }}
                      >
                        <UserMinus className="w-3.5 h-3.5" /> Remove
                      </ActionButton>
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          {/* ---------------- Game settings ---------------- */}
          <TabsContent value="game">
            {game ? (
              <GameSettings
                key={game.id}
                game={game}
                busy={busy}
                onSave={async (changes) => {
                  const ok = await run("game", { action: "update_game", game_id: game.id, changes }, "Game settings saved");
                  if (ok) await loadGames();
                }}
                onDelete={async () => {
                  if (!confirm(`Delete "${game.name}" for everyone? All its players, stocks and history are removed. This can't be undone.`)) return;
                  setBusy("delete");
                  const r = await callFn("admin-set-cash", { action: "delete_game", game_id: game.id });
                  setBusy(null);
                  if (r.error) return toast({ title: "Didn't work", description: r.error, variant: "destructive" });
                  toast({ title: `Deleted "${game.name}"` });
                  if (game.id === currentGameId) return onGameDeleted();
                  setGameId(currentGameId);
                  loadGames();
                }}
              />
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">Pick a game.</p>
            )}
          </TabsContent>

          {/* ---------------- Server ---------------- */}
          <TabsContent value="server">
            <ServerPanel
              open={open}
              onHousekeeping={async () => {
                await loadPlayers();
                loadGames();
                onChanged();
              }}
            />
          </TabsContent>
        </Tabs>

        {stocksPlayer && (
          <AdminHoldingsDialog
            player={{
              member_id: stocksPlayer.member_id,
              name: stocksPlayer.name,
              cash: stocksPlayer.cash,
              positions: stocksPlayer.positions.map((x) => ({ symbol: x.symbol, shares: x.shares, avgCost: x.avg_cost })),
            }}
            priceMap={new Map(stocksPlayer.positions.map((x) => [x.symbol, x.last]))}
            onClose={() => setStocksFor(null)}
            onChanged={afterChange}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};

const ActionButton = ({
  children,
  onClick,
  danger,
  busy,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
  busy?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={busy}
    className={cn(
      "h-8 px-2.5 rounded-lg border text-xs font-bold inline-flex items-center gap-1 transition-colors disabled:opacity-50",
      danger ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" : "hover:border-primary hover:text-primary",
    )}
  >
    {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
    {children}
  </button>
);

const GameSettings = ({
  game,
  busy,
  onSave,
  onDelete,
}: {
  game: GameRow;
  busy: string | null;
  onSave: (changes: Record<string, unknown>) => void;
  onDelete: () => void;
}) => {
  const initial = {
    name: game.name,
    starting_cash: String(game.starting_cash),
    leverage: String(game.leverage),
    allow_short: game.allow_short,
    is_public: game.is_public,
    min_price: game.min_price == null ? "" : String(game.min_price),
    max_position_pct: game.max_position_pct == null ? "" : String(game.max_position_pct),
    ends_at: game.ends_at ? game.ends_at.slice(0, 10) : "",
  };
  const [form, setForm] = useState(initial);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const changes: Record<string, unknown> = {};
  (Object.keys(form) as (keyof typeof form)[]).forEach((k) => {
    if (form[k] !== initial[k]) changes[k] = k === "ends_at" && form[k] ? `${form[k]}T23:59:59Z` : form[k];
  });
  const dirty = Object.keys(changes).length > 0;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty) onSave(changes);
      }}
    >
      <Field label="Name">
        <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Starting cash ($)" hint="Changes everyone's baseline">
          <input inputMode="decimal" value={form.starting_cash} onChange={(e) => set("starting_cash", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Leverage (×)" hint="1 = no borrowing">
          <input inputMode="decimal" value={form.leverage} onChange={(e) => set("leverage", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Min stock price ($)" hint="Blank = none">
          <input inputMode="decimal" value={form.min_price} onChange={(e) => set("min_price", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Max in one stock (%)" hint="Blank = none">
          <input inputMode="decimal" value={form.max_position_pct} onChange={(e) => set("max_position_pct", e.target.value)} className={inputCls} />
        </Field>
      </div>
      <Field label="End date" hint="Blank = never ends">
        <input type="date" value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} className={inputCls} />
      </Field>
      <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <Switch checked={form.allow_short} onCheckedChange={(v) => set("allow_short", v)} /> Allow shorting
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <Switch checked={form.is_public} onCheckedChange={(v) => set("is_public", v)} /> Public game
        </label>
      </div>
      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          disabled={!dirty || !!busy}
          className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-extrabold inline-flex items-center gap-2 disabled:opacity-40"
        >
          {busy === "game" && <Loader2 className="w-4 h-4 animate-spin" />} Save settings
        </button>
        {dirty && (
          <button type="button" onClick={() => setForm(initial)} className="h-10 px-3 text-sm font-bold text-muted-foreground">
            Undo
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={!!busy}
          className="ml-auto h-10 px-3 rounded-xl border-2 border-rose-200 text-rose-600 text-sm font-bold inline-flex items-center gap-1.5 hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/30 disabled:opacity-40"
        >
          {busy === "delete" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete game
        </button>
      </div>
    </form>
  );
};

const inputCls = "mt-1 w-full h-10 rounded-xl border bg-background px-3 text-sm tabular-nums";

const Field = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
    {label}
    {children}
    {hint && <span className="block mt-1 normal-case tracking-normal font-normal">{hint}</span>}
  </label>
);

type FnStatus = { state: "checking" } | { state: "live"; build: string } | { state: "old" } | { state: "missing" } | { state: "error"; message: string };

const ServerPanel = ({ open, onHousekeeping }: { open: boolean; onHousekeeping: () => void }) => {
  const [status, setStatus] = useState<Record<string, FnStatus>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const check = useCallback(async () => {
    const fns = ["place-order", "admin-set-cash", "join-game"];
    setStatus(Object.fromEntries(fns.map((f) => [f, { state: "checking" } as FnStatus])));
    const results = await Promise.all(fns.map((f) => callFn<{ build?: string }>(f, { action: "ping" })));
    setStatus(
      Object.fromEntries(
        fns.map((f, i) => {
          const r = results[i];
          if (r.notDeployed) return [f, { state: "missing" }];
          if (r.data?.build) return [f, { state: "live", build: r.data.build }];
          // An old build doesn't know "ping" and answers like a normal request.
          if (r.error) return [f, /invalid input|join code|member_id/i.test(r.error) ? { state: "old" } : { state: "error", message: r.error }];
          return [f, { state: "old" }];
        }),
      ),
    );
  }, []);

  useEffect(() => {
    if (open) check();
  }, [open, check]);

  const allCurrent = ["place-order", "admin-set-cash", "join-game"].every((f) => {
    const s = status[f];
    return s?.state === "live" && s.build === EXPECTED_BUILD;
  });

  const housekeeping = async (key: string, fn: string, body: Record<string, unknown>, describe: (d: Record<string, number>) => string) => {
    setBusy(key);
    const r = await callFn<Record<string, number>>(fn, body);
    setBusy(null);
    if (r.error) return toast({ title: "Didn't work", description: r.error, variant: "destructive" });
    toast({ title: describe(r.data ?? {}) });
    onHousekeeping();
  };

  const label: Record<string, string> = {
    "place-order": "Order engine",
    "admin-set-cash": "Admin controls",
    "join-game": "Joining & cleanup",
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold">Server functions</span>
          <button type="button" onClick={check} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> Check again
          </button>
        </div>
        {Object.entries(label).map(([fn, name]) => {
          const s = status[fn];
          const ok = s?.state === "live" && s.build === EXPECTED_BUILD;
          return (
            <div key={fn} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {name} <span className="text-xs text-muted-foreground">({fn})</span>
              </span>
              <span className={cn("text-xs font-bold", ok ? "text-emerald-600" : "text-rose-600")}>
                {!s || s.state === "checking"
                  ? "checking…"
                  : s.state === "live"
                  ? ok
                    ? "up to date"
                    : `older build (${s.build})`
                  : s.state === "missing"
                  ? "not deployed"
                  : s.state === "old"
                  ? "old version"
                  : s.message}
              </span>
            </div>
          );
        })}
        {!allCurrent && Object.keys(status).length > 0 && Object.values(status).every((s) => s.state !== "checking") && (
          <div className="pt-2 border-t mt-2 space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Server code only goes live when Lovable deploys it. Until then the dev console can't save changes and
              other players' figures are estimates. Paste this into Lovable's chat:
            </p>
            <div className="rounded-xl bg-muted/50 p-2.5 text-xs leading-relaxed">{DEPLOY_REQUEST}</div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(DEPLOY_REQUEST);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="h-8 px-2.5 rounded-lg border text-xs font-bold inline-flex items-center gap-1.5 hover:border-primary"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? "Copied" : "Copy request"}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border p-3.5 space-y-3">
        <span className="text-sm font-extrabold">Housekeeping</span>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            busy={busy === "sync"}
            onClick={() =>
              housekeeping("sync", "admin-set-cash", { action: "reconcile_all" }, (d) =>
                `Checked ${d.checked ?? 0} players, fixed ${d.fixed ?? 0} balance${d.fixed === 1 ? "" : "s"}`,
              )
            }
          >
            Sync all balances
          </ActionButton>
          <ActionButton
            busy={busy === "cleanup"}
            onClick={() =>
              housekeeping("cleanup", "join-game", { action: "cleanup_empty_games" }, (d) =>
                `Removed ${d.removed ?? 0} empty game${d.removed === 1 ? "" : "s"}`,
              )
            }
          >
            Remove empty games
          </ActionButton>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Sync rewrites every player's stored cash to match their trade history (the leaderboard reads it). Empty games are
          ones nobody is in, over an hour old.
        </p>
      </div>
    </div>
  );
};
