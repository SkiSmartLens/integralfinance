import { useEffect, useMemo, useState } from "react";
import { ChevronDown, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/yahoo";

const env = import.meta.env as Record<string, string | undefined>;
const normalizeUrl = (value?: string) => {
  if (!value) return undefined;
  return value.startsWith("http") ? value : `https://${value}`;
};
const SUPABASE_URL =
  normalizeUrl(env.VITE_SUPABASE_URL) ??
  normalizeUrl(env.VITE_SUPABASE_HOST) ??
  (env.VITE_SUPABASE_PROJECT_ID ? `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co` : undefined) ??
  "https://oadtpipsbeqiadoluxnq.supabase.co";
const ANON = (env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  env.VITE_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hZHRwaXBzYmVxaWFkb2x1eG5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDUyNDYsImV4cCI6MjA5MzU4MTI0Nn0.k7_W04vpl9Sctg1XhNlSz9abWI--VPk82jD5r-0hFvk") as string;

interface Contract {
  contractSymbol: string;
  strike: number;
  lastPrice?: number;
  bid?: number;
  ask?: number;
  change?: number;
  percentChange?: number;
  volume?: number;
  openInterest?: number;
  impliedVolatility?: number;
  inTheMoney?: boolean;
}

interface OptionsPayload {
  expirationDates: number[];
  strikes: number[];
  underlyingSymbol: string;
  quote: { regularMarketPrice?: number };
  options: { expirationDate: number; calls: Contract[]; puts: Contract[] }[];
}

async function fetchOptions(symbol: string, date?: number): Promise<OptionsPayload | null> {
  const qs = new URLSearchParams({ kind: "options", symbol });
  if (date) qs.set("date", String(date));
  const res = await fetch(`${SUPABASE_URL}/functions/v1/yahoo-proxy?${qs.toString()}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  });
  if (!res.ok) return null;
  const j = await res.json().catch(() => null);
  return j?.optionChain?.result?.[0] ?? null;
}

const fmtDate = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const fmtPct = (n?: number) => (n == null ? "—" : `${(n * 100).toFixed(1)}%`);

export const OptionsChain = ({ symbol }: { symbol: string }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<OptionsPayload | null>(null);
  const [expiration, setExpiration] = useState<number | null>(null);
  const [side, setSide] = useState<"calls" | "puts">("calls");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setErr(null);
    fetchOptions(symbol)
      .then((d) => {
        if (!d) {
          setErr("No options data available for this symbol.");
          return;
        }
        setData(d);
        setExpiration(d.expirationDates?.[0] ?? null);
      })
      .catch(() => setErr("Failed to load options chain."))
      .finally(() => setLoading(false));
  }, [open, symbol]);

  // If user picks a different expiration, refetch to get contracts for that date.
  useEffect(() => {
    if (!open || !data || expiration == null) return;
    const alreadyLoaded = data.options?.[0]?.expirationDate === expiration;
    if (alreadyLoaded) return;
    setLoading(true);
    fetchOptions(symbol, expiration)
      .then((d) => d && setData(d))
      .finally(() => setLoading(false));
  }, [expiration, open, symbol, data]);

  const contracts = useMemo<Contract[]>(() => {
    if (!data) return [];
    const chain = data.options?.[0];
    if (!chain) return [];
    return (side === "calls" ? chain.calls : chain.puts) ?? [];
  }, [data, side]);

  const spot = data?.quote?.regularMarketPrice;

  return (
    <section className="bg-card border rounded-lg">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 p-4 md:p-5 text-left"
        aria-expanded={open}
        aria-controls={`options-panel-${symbol}`}
      >
        <div>
          <h3 className="text-lg font-bold">Options chain · {symbol}</h3>
          <p className="text-xs text-muted-foreground">Live calls and puts from Yahoo Finance.</p>
        </div>
        <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div id={`options-panel-${symbol}`} className="border-t p-4 md:p-5 space-y-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading options…
            </div>
          )}
          {err && <div className="text-sm text-muted-foreground bg-muted/40 rounded p-3">{err}</div>}
          {data && !loading && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-semibold text-muted-foreground">Expiration</label>
                <select
                  value={expiration ?? ""}
                  onChange={(e) => setExpiration(Number(e.target.value))}
                  className="text-sm rounded-md border bg-background px-2 py-1"
                >
                  {data.expirationDates?.map((d) => (
                    <option key={d} value={d}>{fmtDate(d)}</option>
                  ))}
                </select>
                <div className="ml-auto flex rounded-full bg-muted/40 p-0.5 text-xs font-semibold">
                  <button
                    onClick={() => setSide("calls")}
                    className={cn("px-3 py-1 rounded-full flex items-center gap-1", side === "calls" ? "bg-up text-background" : "text-muted-foreground")}
                  >
                    <TrendingUp className="w-3.5 h-3.5" /> Calls
                  </button>
                  <button
                    onClick={() => setSide("puts")}
                    className={cn("px-3 py-1 rounded-full flex items-center gap-1", side === "puts" ? "bg-down text-background" : "text-muted-foreground")}
                  >
                    <TrendingDown className="w-3.5 h-3.5" /> Puts
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs tabular-nums">
                  <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr className="border-b">
                      <th className="text-left py-1.5 pr-3">Strike</th>
                      <th className="text-right px-2">Last</th>
                      <th className="text-right px-2 hidden sm:table-cell">Bid</th>
                      <th className="text-right px-2 hidden sm:table-cell">Ask</th>
                      <th className="text-right px-2">Chg %</th>
                      <th className="text-right px-2 hidden md:table-cell">Vol</th>
                      <th className="text-right px-2 hidden md:table-cell">OI</th>
                      <th className="text-right pl-2">IV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.slice(0, 40).map((c) => {
                      const chg = c.percentChange ?? 0;
                      const up = chg >= 0;
                      const itm = spot != null && (side === "calls" ? c.strike <= spot : c.strike >= spot);
                      return (
                        <tr key={c.contractSymbol} className={cn("border-b border-border/40", itm && "bg-accent/30")}>
                          <td className="py-1.5 pr-3 font-semibold">${formatNumber(c.strike)}</td>
                          <td className="text-right px-2">{c.lastPrice != null ? `$${formatNumber(c.lastPrice)}` : "—"}</td>
                          <td className="text-right px-2 hidden sm:table-cell">{c.bid != null ? `$${formatNumber(c.bid)}` : "—"}</td>
                          <td className="text-right px-2 hidden sm:table-cell">{c.ask != null ? `$${formatNumber(c.ask)}` : "—"}</td>
                          <td className={cn("text-right px-2 font-semibold", up ? "text-up" : "text-down")}>
                            {chg ? `${up ? "+" : ""}${formatNumber(chg)}%` : "—"}
                          </td>
                          <td className="text-right px-2 hidden md:table-cell">{c.volume ?? "—"}</td>
                          <td className="text-right px-2 hidden md:table-cell">{c.openInterest ?? "—"}</td>
                          <td className="text-right pl-2">{fmtPct(c.impliedVolatility)}</td>
                        </tr>
                      );
                    })}
                    {contracts.length === 0 && (
                      <tr><td colSpan={8} className="py-4 text-center text-muted-foreground">No contracts for this expiration.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Highlighted rows are in-the-money vs the current spot price {spot ? `$${formatNumber(spot)}` : ""}. Data may be
                delayed 15 minutes.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
};
