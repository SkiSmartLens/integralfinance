import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TradeTicket } from "./TradeTicket";

const ticket = (symbol: string, price: number) => (
  <TradeTicket symbol={symbol} price={price} cash={150} heldShares={0} placing={false} marketOpen onExecute={() => {}} />
);

describe("TradeTicket", () => {
  it("says why a buy is blocked when the cash is all invested", () => {
    render(ticket("AAPL", 340.59));
    expect(
      screen.getByText(
        "1 share of AAPL costs $340.59, but you only have $150 in cash. Sell some stock to free up cash.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /Buy 1 share/ }).hasAttribute("disabled")).toBe(true);
  });

  it("still lets you buy a stock you can afford", () => {
    render(ticket("HOOD", 98.62));
    expect(screen.queryByText(/but you only have/)).toBeNull();
    expect(screen.getByRole("button", { name: /Buy 1 share/ }).hasAttribute("disabled")).toBe(false);
  });
});

describe("TradeTicket with 2x leverage", () => {
  it("$0.01 of cash buys at most $0.02", () => {
    render(
      <TradeTicket symbol="HOOD" price={98.62} cash={0.01} spendable={0.02} leverage={2} heldShares={0} placing={false} marketOpen onExecute={() => {}} />,
    );
    expect(screen.getByText("$0.02")).toBeTruthy();
    expect(
      screen.getByText("1 share of HOOD costs $98.62, but you only have $0.02 of buying power. Sell some stock to free up cash."),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /Buy 1 share/ }).hasAttribute("disabled")).toBe(true);
  });
});
