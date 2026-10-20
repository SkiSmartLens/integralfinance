import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Leaderboard } from "./Leaderboard";

// Four players in a $100k game: Ana is up, Bo is down, Cy and you haven't traded.
const tables: Record<string, unknown[]> = {
  game_members: [
    { id: "m-ana", user_id: "u-ana", cash: 90_000 },
    { id: "m-bo", user_id: "u-bo", cash: 95_000 },
    { id: "m-cy", user_id: "u-cy", cash: 100_000 },
    { id: "m-me", user_id: "u-me", cash: 100_000 },
  ],
  positions: [
    { member_id: "m-ana", symbol: "AAPL", shares: 100, avg_cost: 100 },
    { member_id: "m-bo", symbol: "MSFT", shares: 10, avg_cost: 500 },
  ],
  profiles: [
    { user_id: "u-ana", display_name: "Ana" },
    { user_id: "u-bo", display_name: "Bo" },
    { user_id: "u-cy", display_name: "Cy" },
    { user_id: "u-me", display_name: "Me" },
  ],
};

// sim_leaderboard's answer; by default it isn't installed, so the tables are read.
const notInstalled = { data: null, error: { code: "PGRST202", message: "Could not find the function public.sim_leaderboard" } };
let rpcResult: { data: unknown; error: unknown } = notInstalled;

vi.mock("@/lib/backend", () => {
  const query = (table: string) => {
    const result = Promise.resolve({ data: tables[table] ?? [], error: null });
    const chain = { select: () => chain, eq: () => result, in: () => result };
    return chain;
  };
  return { supabase: { from: query, rpc: () => Promise.resolve(rpcResult) } };
});
let quotes: { symbol: string; regularMarketPrice?: number }[] = [];
vi.mock("@/hooks/useLiveQuotes", () => ({ useLiveQuotes: () => ({ quotes }) }));
beforeEach(() => {
  rpcResult = notInstalled;
  quotes = [
    { symbol: "AAPL", regularMarketPrice: 120 },
    { symbol: "MSFT", regularMarketPrice: 400 },
  ];
});
vi.mock("@/lib/simAdmin", () => ({ useCashSynced: () => true }));

const rowFor = (name: string) => screen.getByTitle(`See ${name}'s holdings`).closest("li")!;

describe("Leaderboard", () => {
  it("players who haven't traded show N/A below everyone ranked", async () => {
    render(<Leaderboard gameId="g" meUserId="u-me" startingCash={100_000} myCash={100_000} myTraded={false} />);
    await screen.findByText("Ana");

    const order = screen.getAllByRole("listitem").map((li) => within(li).getByRole("button").textContent);
    expect(order).toEqual(["Ana", "Bo", "Cy", "Me(you)"]);

    expect(within(rowFor("Ana")).getByText("1")).toBeTruthy();
    expect(within(rowFor("Bo")).getByText("2")).toBeTruthy();
    expect(within(rowFor("Cy")).getByText("N/A")).toBeTruthy();
    expect(within(rowFor("Cy")).getByText("No trades yet")).toBeTruthy();
    expect(within(rowFor("Me")).getByText("N/A")).toBeTruthy();
    expect(screen.getByText("Your rank: N/A")).toBeTruthy();
  });

  it("your own trade history ranks you even if you're back to exactly $100k", async () => {
    render(<Leaderboard gameId="g" meUserId="u-me" startingCash={100_000} myCash={100_000} myTraded />);
    await screen.findByText("Ana");

    // Ana $102k, you $100k, Bo $99k; Cy hasn't traded.
    expect(within(rowFor("Me")).getByText("2")).toBeTruthy();
    expect(screen.getByText("Your rank: #2 of 3")).toBeTruthy();
    expect(within(rowFor("Cy")).getByText("N/A")).toBeTruthy();
  });

  it("your row counts stocks bought since the leaderboard loaded", async () => {
    // The loaded rows still show you with $100k and no stocks, but you've since
    // spent all but $150 on HOOD. Cash alone would put you at $150.
    render(
      <Leaderboard
        gameId="g"
        meUserId="u-me"
        startingCash={100_000}
        myCash={150}
        myHoldings={[{ symbol: "HOOD", shares: 1000, avgCost: 99.85, last: 98.62 }]}
        myTraded
      />,
    );
    await screen.findByText("Ana");

    expect(within(rowFor("Me")).getByText("$98,770")).toBeTruthy();
    expect(screen.getByText("Your rank: #3 of 3")).toBeTruthy();
  });

  it("players who can only read their own rows still see everyone in the game", async () => {
    // What the database function returns to a regular player (cash per trade
    // history). Cy got a $500 admin top-up but never traded.
    rpcResult = {
      data: [
        { member_id: "m-ana", is_me: false, display_name: "Ana", cash: "90000", traded: true, positions: [{ symbol: "AAPL", shares: "100", avg_cost: "100" }] },
        { member_id: "m-bo", is_me: false, display_name: "Bo", cash: 95_000, traded: true, positions: [{ symbol: "MSFT", shares: 10, avg_cost: 500 }] },
        { member_id: "m-cy", is_me: false, display_name: "Cy", cash: 100_500, traded: false, positions: [] },
        { member_id: "m-me", is_me: true, display_name: "Me", cash: 99_000, traded: true, positions: [{ symbol: "MSFT", shares: 2, avg_cost: 500 }] },
      ],
      error: null,
    };
    render(<Leaderboard gameId="g" meUserId="u-me" startingCash={100_000} myCash={99_000} myTraded />);
    await screen.findByText("Ana");

    const order = screen.getAllByRole("listitem").map((li) => within(li).getByRole("button").textContent);
    // Ana $102k, Bo $99k, you $99,800; Cy has no rank.
    expect(order).toEqual(["Ana", "Me(you)", "Bo", "Cy"]);
    expect(within(rowFor("Ana")).getByText("$102,000")).toBeTruthy();
    expect(within(rowFor("Cy")).getByText("N/A")).toBeTruthy();
    expect(screen.getByText("Your rank: #2 of 3")).toBeTruthy();
  });

  it("a stock with no live price counts at its average cost, not $0", async () => {
    quotes = [{ symbol: "AAPL" }, { symbol: "MSFT", regularMarketPrice: 400 }];
    render(<Leaderboard gameId="g" meUserId="u-me" startingCash={100_000} myCash={100_000} myTraded={false} />);
    await screen.findByText("Ana");

    // Ana: $90k cash + 100 AAPL at their $100 average cost.
    expect(within(rowFor("Ana")).getByText("$100,000")).toBeTruthy();
  });
});
