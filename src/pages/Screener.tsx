import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { fetchScreener, formatNumber, formatLargeNumber, ScreenerQuote } from "@/lib/yahoo";
import { cn } from "@/lib/utils";
import { LineChart, ArrowUpDown } from "lucide-react";

const PRESETS: { id: string; label: string; desc: string }[] = [
  { id: "day_gainers", label: "Top Gainers", desc: "Biggest % movers up today" },
  { id: "day_losers", label: "Top Losers", desc: "Biggest % movers down today" },
  { id: "most_actives", label: "Most Active", desc: "Highest volume" },
  { id: "undervalued_growth_stocks", label: "Undervalued Growth", desc: "Low P/E + growing" },
  { id: "growth_technology_stocks", label: "Growth Tech", desc: "High-growth tech names" },
  { id: "aggressive_small_caps", label: "Aggressive Small-Caps", desc: "Small-cap growth bets" },
  { id: "small_cap_gainers", label: "Small-Cap Gainers", desc: "Top small-cap movers" },
  { id: "undervalued_large_caps", label: "Undervalued Large-Caps", desc: "Cheap mega-caps" },
  { id: "top_options_implied_volatility", label: "High IV Options", desc: "Volatile options chains" },
];

type SortKey = "symbol" | "regularMarketPrice" | "regularMarketChangePercent" | "regularMarketVolume" | "marketCap" | "trailingPE";

export default function Screener() {
  const [scrId, setScrId] = useState("day_gainers");
  const [rows, setRows] = useState<ScreenerQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("regularMarketChangePercent");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true); setErr(null);
    fetchScreener(scrId, 50)
      .then((q) => { if (alive) setRows(q); })
      .catch((e) => { if (alive) setErr(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [scrId]);

  const filtered = useMemo(() => {
    const min = minPrice ? Number(minPrice) : -Infinity;
    const max = maxPrice ? Number(maxPrice) : Infinity;
    const q = search.trim().toUpperCase();
    return rows
      .filter((r) => {
        const p = r.regularMarketPrice ?? 0;
        if (p < min || p > max) return false;
        if (q && !(r.symbol?.toUpperCase().includes(q) || r.shortName?.toUpperCase().includes(q))) return false;
        return true;
      })
      .sort((a, b) => {
        const av = (a[sortKey] as number | string | undefined) ?? 0;
        const bv = (b[sortKey] as number | string | undefined) ?? 0;
        if (typeof av === "string" || typeof bv === "string") {
          return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
        }
        return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
      });
  }, [rows, sortKey, sortDir, minPrice, maxPrice, search]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Markets</Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-bold flex items-center gap-1.5"><LineChart className="w-4 h-4" /> Screeners</span>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 space-y-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => setScrId(p.id)}
              className={cn("px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                scrId === p.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="bg-card border rounded-lg p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search symbol/name" className="px-3 py-2 bg-muted rounded text-sm outline-none" />
          <input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} type="number"
            placeholder="Min price" className="px-3 py-2 bg-muted rounded text-sm outline-none" />
          <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} type="number"
            placeholder="Max price" className="px-3 py-2 bg-muted rounded text-sm outline-none" />
          <div className="text-xs text-muted-foreground self-center">
            {PRESETS.find((p) => p.id === scrId)?.desc} · {filtered.length} results
          </div>
        </div>

        <div className="bg-card border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">Loading…</div>
          ) : err ? (
            <div className="p-12 text-center text-down">{err}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No matches.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b bg-muted/30">
                  <tr>
                    <Th onClick={() => toggleSort("symbol")} active={sortKey === "symbol"}>Symbol</Th>
                    <th className="text-left px-3 py-2 hidden md:table-cell">Name</th>
                    <Th onClick={() => toggleSort("regularMarketPrice")} active={sortKey === "regularMarketPrice"} right>Price</Th>
                    <Th onClick={() => toggleSort("regularMarketChangePercent")} active={sortKey === "regularMarketChangePercent"} right>Change %</Th>
                    <Th onClick={() => toggleSort("regularMarketVolume")} active={sortKey === "regularMarketVolume"} right>Volume</Th>
                    <Th onClick={() => toggleSort("marketCap")} active={sortKey === "marketCap"} right>Mkt Cap</Th>
                    <Th onClick={() => toggleSort("trailingPE")} active={sortKey === "trailingPE"} right>P/E</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const chg = r.regularMarketChangePercent ?? 0;
                    return (
                      <tr key={r.symbol} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="px-3 py-2 font-bold">{r.symbol}</td>
                        <td className="px-3 py-2 hidden md:table-cell text-muted-foreground truncate max-w-[240px]">{r.shortName ?? r.longName}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatNumber(r.regularMarketPrice)}</td>
                        <td className={cn("px-3 py-2 text-right tabular-nums font-semibold", chg >= 0 ? "text-up" : "text-down")}>
                          {chg >= 0 ? "+" : ""}{formatNumber(chg)}%
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatLargeNumber(r.regularMarketVolume)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatLargeNumber(r.marketCap)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.trailingPE ? formatNumber(r.trailingPE) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const Th = ({ children, onClick, active, right }: { children: React.ReactNode; onClick: () => void; active?: boolean; right?: boolean }) => (
  <th className={cn("px-3 py-2 cursor-pointer select-none", right ? "text-right" : "text-left", active && "text-foreground")}
      onClick={onClick}>
    <span className="inline-flex items-center gap-1">{children}<ArrowUpDown className="w-3 h-3 opacity-60" /></span>
  </th>
);
