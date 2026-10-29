import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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

describe("TradeTicket: the bar sizes against buying power", () => {
  const leveraged = () =>
    render(<TradeTicket symbol="AAPL" price={100} cash={100000} spendable={200000} leverage={2} heldShares={0} placing={false} marketOpen onExecute={() => {}} />);

  it("with 2x leverage, 100% buys $200k with $100k cash (half of it borrowed)", () => {
    leveraged();
    expect(screen.getByText("2,000 max")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "100%" }));
    expect(screen.getByRole("button", { name: /Buy 2,000 shares/ }).hasAttribute("disabled")).toBe(false);
    expect(screen.getAllByText("$200,000")).toHaveLength(2); // total cost and buying power
    expect(screen.getByText("$100,000 borrowed")).toBeTruthy();
    expect(screen.getByText("100% of buying power")).toBeTruthy();
  });

  it("dragging the bar halfway uses just your own cash", () => {
    leveraged();
    fireEvent.change(screen.getByRole("slider", { name: "Shares" }), { target: { value: "1000" } });
    expect(screen.getByRole("button", { name: /Buy 1,000 shares/ })).toBeTruthy();
    expect(screen.getByText("50% of buying power")).toBeTruthy();
    expect(screen.queryByText(/borrowed$/)).toBeNull();
  });

  it("without leverage, 100% is all your cash", () => {
    render(<TradeTicket symbol="AAPL" price={100} cash={10000} heldShares={0} placing={false} marketOpen onExecute={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "100%" }));
    expect(screen.getByRole("button", { name: /Buy 100 shares/ })).toBeTruthy();
    expect(screen.getByText("100% of your cash")).toBeTruthy();
  });
});

describe("TradeTicket: typing a share count", () => {
  it("the 1 can be deleted and replaced", () => {
    render(ticket("HOOD", 98.62));
    const box = screen.getByRole("spinbutton", { name: "Number of shares" }) as HTMLInputElement;
    fireEvent.change(box, { target: { value: "" } });
    expect(box.value).toBe("");
    // Nothing to buy yet, but no error for an empty box either.
    const [, order] = screen.getAllByRole("button", { name: "Buy" }); // the side toggle, then the order button
    expect(order.hasAttribute("disabled")).toBe(true);
    expect(screen.queryByText("Enter a whole number of shares.")).toBeNull();
    fireEvent.change(box, { target: { value: "5" } });
    expect(box.value).toBe("5");
    expect((screen.getByRole("slider", { name: "Shares" }) as HTMLInputElement).value).toBe("1"); // $150 cash buys 1
    expect(screen.getByText("5 shares of HOOD cost $493.1, but you only have $150 in cash. Try fewer shares.")).toBeTruthy();
  });

  it("flags part shares", () => {
    render(ticket("HOOD", 98.62));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Number of shares" }), { target: { value: "1.5" } });
    expect(screen.getByText("Enter a whole number of shares.")).toBeTruthy();
  });
});
