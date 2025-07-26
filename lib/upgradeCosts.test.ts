import { expectedEnchantmentUpgradeCost } from "./upgradeCosts";

describe("expectedEnchantmentUpgradeCost", () => {
  const basicUpgradeItems = [
    [
      { amount: 100, price: 2 },
      { amount: 100, price: 3 },
      { amount: 100, price: 4 },
    ],
    [
      { amount: 100, price: 5 },
      { amount: 100, price: 6 },
      { amount: 100, price: 7 },
    ],
    [
      { amount: 100, price: 8 },
      { amount: 100, price: 9 },
      { amount: 100, price: 10 },
    ],
  ];
  it("calculates cost for 0→3 upgrade for armors", () => {
    const result = expectedEnchantmentUpgradeCost(
      0,
      3,
      "armors", // N=192
      basicUpgradeItems
    );
    expect(result).toBe(
      // 0->1
      100 * basicUpgradeItems[0][0].price +
        92 * basicUpgradeItems[0][1].price +
        // 1->2
        100 * basicUpgradeItems[1][0].price +
        92 * basicUpgradeItems[1][1].price +
        // 2->3
        100 * basicUpgradeItems[2][0].price +
        92 * basicUpgradeItems[2][1].price
    );
  });

  it("should return null if not enough items for upgrade", () => {
    const result = expectedEnchantmentUpgradeCost(
      0,
      3,
      "2H-weapon", // N=384
      basicUpgradeItems
    );
    expect(result).toBe(null);
  });

  it("should return null if not enough items for upgrade", () => {
    const result = expectedEnchantmentUpgradeCost(
      0,
      3,
      "2H-weapon", // N=384
      [[], [], []]
    );
    expect(result).toBe(null);
  });

  it("throws error for negative enchantment levels when toEnchantment > fromEnchantment", () => {
    expect(() =>
      expectedEnchantmentUpgradeCost(-1, 0, "2H-weapon", basicUpgradeItems)
    ).toThrow("Enchantment levels must be positive.");

    expect(() =>
      expectedEnchantmentUpgradeCost(0, 1, "1H-weapon", basicUpgradeItems)
    ).not.toThrow();
    expect(() =>
      expectedEnchantmentUpgradeCost(0, -1, "1H-weapon", basicUpgradeItems)
    ).not.toThrow(); // returns 0, no error
  });

  it("throws error for toEnchantment > 3", () => {
    expect(() =>
      expectedEnchantmentUpgradeCost(0, 4, "armors", basicUpgradeItems)
    ).toThrow("Enchantment levels can only be enchanted up to level 3.");
  });

  it("throws error for unknown item category", () => {
    expect(() =>
      expectedEnchantmentUpgradeCost(
        0,
        1,
        "unknown-category" as any,
        basicUpgradeItems
      )
    ).toThrow();
  });

  it("returns 0 for no-op upgrades (fromEnchantment >= toEnchantment)", () => {
    expect(
      expectedEnchantmentUpgradeCost(1, 1, "2H-weapon", basicUpgradeItems)
    ).toBe(0);
    expect(
      expectedEnchantmentUpgradeCost(2, 1, "1H-weapon", basicUpgradeItems)
    ).toBe(0);
    expect(
      expectedEnchantmentUpgradeCost(3, 0, "armors", basicUpgradeItems)
    ).toBe(0);
    expect(
      expectedEnchantmentUpgradeCost(0, 0, "head", basicUpgradeItems)
    ).toBe(0);
  });
});
