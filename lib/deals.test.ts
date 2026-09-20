import { getDeals } from "./deals";

type DealInput = Parameters<typeof getDeals>[0];
type SellOrder = DealInput["sellOrders"][number];
type BuyOrder = DealInput["buyOrders"][number];

function makeSellOrder(overrides: Partial<SellOrder> = {}): SellOrder {
  return {
    id: 1,
    item_type_id: "T6_MAIN_SWORD",
    item_group_type_id: "T6_MAIN_SWORD",
    tier: 6,
    enchantment_level: 0,
    quality_level: 1,
    unit_price_silver: 100,
    created_at: new Date("2026-01-01"),
    amount: 1,
    location_id: 1000,
    ...overrides,
  };
}

function makeBuyOrder(overrides: Partial<BuyOrder> = {}): BuyOrder {
  return {
    id: 2,
    item_type_id: "T6_MAIN_SWORD@1",
    item_group_type_id: "T6_MAIN_SWORD",
    enchantment_level: 0,
    quality_level: 1,
    unit_price_silver: 300,
    created_at: new Date("2026-01-01"),
    amount: 1,
    location_id: 2000,
    ...overrides,
  };
}

function makeInput(
  sellOrders: SellOrder[],
  buyOrders: BuyOrder[],
  overrides: Partial<DealInput> = {},
): DealInput {
  return {
    sellOrders,
    buyOrders,
    premium: false,
    minProfit: 0,
    minPercentualProfit: 0,
    profitGate: "and",
    qualityUpgrade: false,
    enchantmentUpgrade: false,
    ...overrides,
  };
}

describe("getDeals", () => {
  it("keeps the highest-profit matching order and reports the potential count", () => {
    const result = getDeals(
      makeInput(
        [
          makeSellOrder({ amount: 1 }),
          makeSellOrder({ id: 3, amount: 1, unit_price_silver: 120 }),
        ],
        [
          makeBuyOrder({ unit_price_silver: 300, amount: 2 }),
          makeBuyOrder({ id: 4, unit_price_silver: 250 }),
        ],
      ),
    );

    expect(result.potentialDealsCount).toBe(4);
    expect(result.deals).toHaveLength(2);
    expect(result.deals.map((deal) => deal.amount)).toEqual([1, 1]);
    expect(result.deals[0].orders.profit).toBe(176);
    expect(result.deals[1].orders.profit).toBe(156);
  });

  it("applies the premium sales tax before profit gates", () => {
    const run = (premium: boolean) =>
      getDeals(
        makeInput(
          [makeSellOrder()],
          [makeBuyOrder({ unit_price_silver: 200 })],
          { minProfit: 90, premium },
        ),
      );

    expect(run(false).deals).toHaveLength(0);
    expect(run(true).deals).toHaveLength(1);
  });

  it("keeps a profitable quality-upgrade recommendation with its cost", () => {
    const result = getDeals(
      makeInput(
        [makeSellOrder()],
        [makeBuyOrder({ unit_price_silver: 50000, quality_level: 3 })],
        { qualityUpgrade: true },
      ),
    );

    expect(result.deals).toHaveLength(1);
    expect(result.deals[0].orders.qualityUpgrade).toBe(true);
    expect(result.deals[0].orders.enchantmentUpgrade).toBe(false);
    expect(result.deals[0].orders.qualityUpgradeCost).toBeCloseTo(
      10.68571429 * 1536,
    );
    expect(result.deals[0].orders.profit).toBeCloseTo(
      50000 - 100 - 50000 * 0.08 - 10.68571429 * 1536,
    );
  });
});
