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
