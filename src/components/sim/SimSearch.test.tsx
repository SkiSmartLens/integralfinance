import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SimSearch } from "./SimSearch";

// What the proxy's search suggests for each query.
const SUGGESTIONS: Record<string, { symbol: string; shortname: string; quoteType: string }[]> = {
  sandisk: [
    { symbol: "SNDK", shortname: "Sandisk Corporation", quoteType: "EQUITY" },
    { symbol: "SNDK.NE", shortname: "Sandisk CDR", quoteType: "EQUITY" },
  ],
  "s&p 500": [
    { symbol: "^GSPC", shortname: "S&P 500", quoteType: "INDEX" },
    { symbol: "SPY", shortname: "SPDR S&P 500 ETF", quoteType: "ETF" },
  ],
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const u = new URL(url);
      const quotes = u.searchParams.get("kind") === "search" ? SUGGESTIONS[u.searchParams.get("q") ?? ""] ?? [] : [];
      return new Response(JSON.stringify({ quotes }));
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

const search = (text: string) => {
  const onSelect = vi.fn();
  render(<SimSearch onSelect={onSelect} />);
  const box = screen.getByLabelText("Find a stock to trade");
  fireEvent.change(box, { target: { value: text } });
  return { onSelect, box };
};

describe("SimSearch: Enter without clicking a suggestion", () => {
  it("opens the top suggestion, even before the suggestions have shown", async () => {
    const { onSelect, box } = search("sandisk");
    fireEvent.keyDown(box, { key: "Enter" });
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith("SNDK"));
  });

  it("skips suggestions that can't be traded", async () => {
    const { onSelect, box } = search("s&p 500");
    fireEvent.keyDown(box, { key: "Enter" });
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith("SPY"));
  });

  it("opens the suggestion arrowed to", async () => {
    const { onSelect, box } = search("sandisk");
    await screen.findByText("SNDK.NE");
    fireEvent.keyDown(box, { key: "ArrowDown" });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("SNDK.NE");
  });

  it("says so when nothing matches a name", async () => {
    const { onSelect, box } = search("no such company");
    fireEvent.keyDown(box, { key: "Enter" });
    expect(await screen.findByText("No stock or fund matches “no such company”.")).toBeTruthy();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("still takes a ticker nothing suggests", async () => {
    const { onSelect, box } = search("xyzq");
    fireEvent.keyDown(box, { key: "Enter" });
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith("XYZQ"));
  });
});
