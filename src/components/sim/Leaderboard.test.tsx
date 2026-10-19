import { describe, it, expect, vi } from "vitest";
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

vi.mock("@/lib/backend", () => {
  const query = (table: string) => {
    const result = Promise.resolve({ data: tables[table] ?? [] });
    const chain = { select: () => chain, eq: () => result, in: () => result };
    return chain;
  };
  return { supabase: { from: query } };
});
vi.mock("@/hooks/useLiveQuotes", () => ({
  useLiveQuotes: () => ({
    quotes: [
      { symbol: "AAPL", regularMarketPrice: 120 },
      { symbol: "MSFT", regularMarketPrice: 400 },
    ],
  }),
}));
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
});
