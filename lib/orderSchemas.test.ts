import { bodySchema } from "./orderSchemas";

describe("order ingestion schema", () => {
  it("preserves the existing Expires normalization", () => {
    const result = bodySchema.safeParse({
      Orders: [
        {
          Id: 17,
          ItemTypeId: "T6_MAIN_SWORD",
          ItemGroupTypeId: "MAIN_SWORD",
          LocationId: "Bridgewatch",
          QualityLevel: 3,
          EnchantmentLevel: 1,
          UnitPriceSilver: 125000,
          Amount: 2,
          AuctionType: "offer",
          Expires: "2026-09-20 12:00:00",
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.Orders[0].Expires).toBe("2026-09-2012:00:00");
      expect(result.data.Orders[0].Id).toBe(17);
    }
  });

  it("rejects an order with an invalid field type", () => {
    expect(
      bodySchema.safeParse({
        Orders: [
          {
            Id: "17",
            ItemTypeId: "T6_MAIN_SWORD",
            ItemGroupTypeId: "MAIN_SWORD",
            LocationId: "Bridgewatch",
            QualityLevel: 3,
            EnchantmentLevel: 1,
            UnitPriceSilver: 125000,
            Amount: 2,
            AuctionType: "offer",
            Expires: "2026-09-20 12:00:00",
          },
        ],
      }).success,
    ).toBe(false);
  });
});
