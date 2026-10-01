import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { PiggyBank, Shield, Percent, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getGlossaryEntry } from "@/content/glossary";

const TOOL_NAV = [
  { id: "compound-interest", label: "Compound Interest" },
  { id: "position-size", label: "Position Size" },
  { id: "dividend-yield", label: "Dividend Yield" },
  { id: "profit-loss", label: "Profit / Loss" },
];

const money = (n: number) =>
  isFinite(n) ? n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }) : "—";
const pct = (n: number) => (isFinite(n) ? `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}%` : "—");

function NumField({
  label,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground block mb-1">{label}</span>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>
        )}
        <input
          type="number"
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          className={cn(
            "w-full py-2 rounded-md border bg-background text-sm outline-none focus:ring-1 focus:ring-primary",
            prefix ? "pl-7" : "pl-3",
            suffix ? "pr-8" : "pr-3",
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{suffix}</span>
        )}
      </div>
    </label>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="rounded-lg border bg-accent/40 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</div>
      <div className={cn("text-lg font-extrabold", tone === "up" && "text-up", tone === "down" && "text-down")}>
        {value}
      </div>
    </div>
  );
}

function ToolCard({
  id,
  icon: Icon,
  title,
  desc,
  formula,
  related,
  children,
}: {
  id: string;
  icon: typeof PiggyBank;
  title: string;
  desc: string;
  formula: string;
  related?: string[];
  children: React.ReactNode;
}) {
  const relatedEntries = (related ?? [])
    .map((slug) => getGlossaryEntry(slug))
    .filter((e): e is NonNullable<typeof e> => !!e);

  return (
    <section id={id} className="bg-card border rounded-lg p-4 md:p-6 scroll-mt-20">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-primary" />
        <h2 className="font-bold">{title}</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{desc}</p>
      {children}
      <p className="text-xs text-muted-foreground mt-4 pt-3 border-t">{formula}</p>
      {relatedEntries.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
          <span className="text-xs text-muted-foreground">Related:</span>
          {relatedEntries.map((e) => (
            <Link
              key={e.slug}
              to={`/learn/glossary/${e.slug}`}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {e.term}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function CompoundInterestCalculator() {
  const [principal, setPrincipal] = useState(1000);
  const [monthly, setMonthly] = useState(100);
  const [rate, setRate] = useState(8);
  const [years, setYears] = useState(20);

  const yearsInt = Math.max(0, Math.min(60, Math.round(years)));
  const monthlyRate = rate / 100 / 12;

  const series = useMemo(() => {
    const points = [{ year: 0, balance: principal }];
    let balance = principal;
    for (let y = 1; y <= yearsInt; y++) {
      for (let m = 0; m < 12; m++) balance = balance * (1 + monthlyRate) + monthly;
      points.push({ year: y, balance: Math.round(balance) });
    }
    return points;
  }, [principal, monthly, monthlyRate, yearsInt]);

  const balance = series[series.length - 1].balance;
  const contributed = principal + monthly * yearsInt * 12;
  const interest = balance - contributed;

  return (
    <ToolCard
      id="compound-interest"
      icon={PiggyBank}
      title="Compound Interest Calculator"
      desc="See how a starting amount plus regular contributions grows over time with compounding."
      formula="Balance compounds monthly at rate ÷ 12, plus your contribution added at the end of every month."
      related={["index-fund", "diversification"]}
    >
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <NumField label="Starting amount" value={principal} onChange={setPrincipal} prefix="$" />
        <NumField label="Monthly contribution" value={monthly} onChange={setMonthly} prefix="$" />
        <NumField label="Annual return" value={rate} onChange={setRate} suffix="%" />
        <NumField label="Years" value={years} onChange={setYears} suffix="yrs" />
      </div>
      {yearsInt > 0 && (
        <div className="h-36 w-full mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="compound-growth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="year"
                tickFormatter={(v) => `Yr ${v}`}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <Tooltip
                cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "3 3" }}
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                  fontSize: 12,
                }}
                labelFormatter={(v) => `Year ${v}`}
                formatter={(v: number) => [money(v), "Balance"]}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#compound-growth)"
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Future value" value={money(balance)} tone="up" />
        <Stat label="Total contributed" value={money(contributed)} />
        <Stat label="Interest earned" value={money(interest)} tone="up" />
      </div>
    </ToolCard>
  );
}

function PositionSizeCalculator() {
  const [account, setAccount] = useState(10000);
  const [riskPct, setRiskPct] = useState(1);
  const [entry, setEntry] = useState(50);
  const [stop, setStop] = useState(47);

  const dollarRisk = account * (riskPct / 100);
  const perShareRisk = Math.abs(entry - stop);
  const shares = perShareRisk > 0 ? Math.floor(dollarRisk / perShareRisk) : 0;
  const positionSize = shares * entry;

  return (
    <ToolCard
      id="position-size"
      icon={Shield}
      title="Position Size Calculator"
      desc="Figure out how many shares to buy so a stop-loss hit only costs a fixed % of your account."
      formula="Shares = (account × risk%) ÷ |entry − stop|, rounded down so you never risk more than you set."
      related={["stop-loss-order", "volatility"]}
    >
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <NumField label="Account size" value={account} onChange={setAccount} prefix="$" />
        <NumField label="Risk per trade" value={riskPct} onChange={setRiskPct} suffix="%" />
        <NumField label="Entry price" value={entry} onChange={setEntry} prefix="$" />
        <NumField label="Stop-loss price" value={stop} onChange={setStop} prefix="$" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Dollar risk" value={money(dollarRisk)} tone="down" />
        <Stat label="Shares to buy" value={shares.toLocaleString("en-US")} />
        <Stat label="Position size" value={money(positionSize)} />
      </div>
    </ToolCard>
  );
}

function DividendYieldCalculator() {
  const [price, setPrice] = useState(100);
  const [dividend, setDividend] = useState(2.5);
  const [shares, setShares] = useState(10);

  const yieldPct = price > 0 ? (dividend / price) * 100 : 0;
  const annualIncome = dividend * shares;

  return (
    <ToolCard
      id="dividend-yield"
      icon={Percent}
      title="Dividend Yield Calculator"
      desc="Check a stock's dividend yield and what it would pay you per year for a given number of shares."
      formula="Yield = annual dividend per share ÷ share price. Annual income = dividend per share × shares owned."
      related={["dividends", "blue-chip-stock"]}
    >
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <NumField label="Share price" value={price} onChange={setPrice} prefix="$" />
        <NumField label="Annual dividend / share" value={dividend} onChange={setDividend} prefix="$" />
        <NumField label="Shares owned" value={shares} onChange={setShares} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Dividend yield" value={pct(yieldPct)} tone="up" />
        <Stat label="Annual income" value={money(annualIncome)} tone="up" />
      </div>
    </ToolCard>
  );
}

function ProfitLossCalculator() {
  const [buy, setBuy] = useState(50);
  const [sell, setSell] = useState(65);
  const [shares, setShares] = useState(10);
  const [fees, setFees] = useState(0);

  const gross = (sell - buy) * shares;
  const net = gross - fees;
  const cost = buy * shares;
  const returnPct = cost > 0 ? (net / cost) * 100 : 0;
  const up = net >= 0;

  return (
    <ToolCard
      id="profit-loss"
      icon={TrendingUp}
      title="Profit / Loss Calculator"
      desc="Work out the gain or loss on a trade after fees, in both dollars and percent."
      formula="Net P/L = (sell − buy) × shares − fees. Return % = net P/L ÷ total cost."
      related={["short-selling", "stop-loss-order"]}
    >
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <NumField label="Buy price" value={buy} onChange={setBuy} prefix="$" />
        <NumField label="Sell price" value={sell} onChange={setSell} prefix="$" />
        <NumField label="Shares" value={shares} onChange={setShares} />
        <NumField label="Total fees" value={fees} onChange={setFees} prefix="$" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Net P/L" value={money(net)} tone={up ? "up" : "down"} />
        <Stat label="Return" value={pct(returnPct)} tone={up ? "up" : "down"} />
      </div>
    </ToolCard>
  );
}

const FinanceTools = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <SEO
      title="Free Finance Calculators — Compound Interest, Position Size & More | IntegralStocks"
      description="Free investing calculators: compound interest, position sizing, dividend yield, and profit/loss — all client-side, no sign-up required."
      path="/tools"
      keywords="compound interest calculator, position size calculator, dividend yield calculator, stock profit calculator, investing calculators"
    />
    <Header />
    <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/learn" className="hover:text-foreground transition-colors">← Learn</Link>
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">Finance Tools</h1>
      <p className="text-muted-foreground mb-4">Four calculators, all running in your browser — nothing saved, nothing sent anywhere.</p>

      <div className="flex flex-wrap gap-2 mb-8">
        {TOOL_NAV.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            {t.label}
          </a>
        ))}
      </div>

      <div className="space-y-4">
        <CompoundInterestCalculator />
        <PositionSizeCalculator />
        <DividendYieldCalculator />
        <ProfitLossCalculator />
      </div>
    </main>
    <SiteFooter />
  </div>
);

export default FinanceTools;
