import { updateDealSearchParams } from "./data-table-query";

describe("updateDealSearchParams", () => {
  it("preserves unrelated search parameters while updating deal options", () => {
    const query = updateDealSearchParams("tier=6&premium=1&world=west", {
      premium: null,
      minProfit: "250",
    });

    expect(Object.fromEntries(new URLSearchParams(query))).toEqual({
      tier: "6",
      world: "west",
      minProfit: "250",
    });
  });

  it("removes options that return to their defaults", () => {
    const query = updateDealSearchParams("tier=6&profitGate=or", {
      profitGate: null,
      minProfit: null,
    });

    expect(query).toBe("tier=6");
  });
});
