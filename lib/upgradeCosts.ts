import { ItemCategory } from "@/lib/items";

const expectedCostVectors = [
  // 1 to >=2
  [4.4],
  // 1 to >=3, 2 to >=3
  [10.68571429, 7.85714286],
  // 1 to >=4, 2 to >=4, 3 to >=4
  [21.71714286, 19.17142857, 13.2],
  // 1 to >=5, 2 to >=5, 3 to >=5, 4 to >=5
  [5500.73857143, 5501.88571429, 5502.2, 5500.0],
]; // See calc.py for the source of these values

/**
 * Calculate the expected cost to upgrade an item from one quality level to another.
 * @param fromQuality The current quality level (1=Normal, 2=Good, 3=Outstanding, 4=Excellent, 5=Masterpiece).
 * @param toQuality The target quality level (1=Normal, 2=Good, 3=Outstanding, 4=Excellent, 5=Masterpiece).
 * @param itemValue The item value of the item being upgraded.
 * @returns The expected cost to upgrade.
 */
function expectedQualityUpgradeCost(
  fromQuality: number,
  toQuality: number,
  itemValue: number
): number {
  if (fromQuality < 1 || fromQuality > 5 || toQuality < 1 || toQuality > 5) {
    throw new Error("Quality levels must be between 1 and 5.");
  }

  if (fromQuality >= toQuality) {
    return 0.0;
  }

  return expectedCostVectors[toQuality - 2][fromQuality - 1] * itemValue;
}

/**
 * Calculate the amount of runes/souls/relics required to upgrade an item's enchantment level.
 * @param itemCategory The category of the item being upgraded.
 * @returns The amount of runes/souls/relics required for the enchantment upgrade.
 */
function enchantmentUpgradeAmount(itemCategory: ItemCategory): number {
  if (itemCategory === "2H-weapon") {
    return 384;
  } else if (itemCategory === "1H-weapon") {
    return 288;
  } else if (itemCategory === "armors" || itemCategory === "bags") {
    return 192;
  } else if (
    itemCategory === "head" ||
    itemCategory === "shoes" ||
    itemCategory === "capes" ||
    itemCategory === "offhands"
  ) {
    return 96;
  } else {
    throw new Error(
      `Unknown item category for enchantment upgrade amount: ${itemCategory}`
    );
  }
}

export type EnchantmentUpgradeItem = {
  amount: number;
  price: number;
};
/**
 * Calculate the expected cost to upgrade an item from one enchantment level to another.
 * @param fromEnchantment The current enchantment level (0=none, 1, 2, 3).
 * @param toEnchantment The target enchantment level (0=none, 1, 2, 3).
 * @param itemCategory The category of the item being upgraded.
 * @param upgradeItems An array of costs for each enchantment level upgrade [rune, soul, relic].
 * @returns The expected cost to upgrade.
 */
function expectedEnchantmentUpgradeCost(
  fromEnchantment: number,
  toEnchantment: number,
  itemCategory: ItemCategory,
  upgradeItems: EnchantmentUpgradeItem[][]
): { totalCost: number; shoppingList: EnchantmentUpgradeItem[][] } | null {
  const shoppingList: [
    EnchantmentUpgradeItem[],
    EnchantmentUpgradeItem[],
    EnchantmentUpgradeItem[],
  ] = [[], [], []];
  if (fromEnchantment < 0 || toEnchantment < 0) {
    throw new Error("Enchantment levels must be positive.");
  }
  if (toEnchantment > 3) {
    throw new Error("Enchantment levels can only be enchanted up to level 3.");
  }

  const N = enchantmentUpgradeAmount(itemCategory);
  let totalCost = 0;
  for (let i = fromEnchantment; i < toEnchantment; i++) {
    for (
      let count = 0, j = 0;
      count < N;
      count += upgradeItems[i][j].amount, j++
    ) {
      if (j >= upgradeItems[i].length) {
        return null; // Not enough items to cover the upgrade
      }
      const amount = Math.min(upgradeItems[i][j].amount, N - count);
      const price = upgradeItems[i][j].price;
      shoppingList[i].push({
        amount,
        price,
      });
      totalCost += amount * price;
    }
  }
  return { totalCost, shoppingList };
}

type EnchantmentUpgradeResourcePrices = [
  EnchantmentUpgradeItem[],
  EnchantmentUpgradeItem[],
  EnchantmentUpgradeItem[],
];
export type EnchantmentUpgradeResourcePricesByTier = {
  4: EnchantmentUpgradeResourcePrices;
  5: EnchantmentUpgradeResourcePrices;
  6: EnchantmentUpgradeResourcePrices;
  7: EnchantmentUpgradeResourcePrices;
  8: EnchantmentUpgradeResourcePrices;
};
/**
 * Get the prices of enchantment upgrade resources (runes, souls, relics) grouped by tier.
 * @param sellOrders The list of sell orders containing item group type IDs, tiers, unit prices, and amounts.
 * @returns An object mapping each tier to an array of enchantment upgrade items for runes, souls, and relics.
 */
function getEnchantmentUpgradeResourcePrices(
  sellOrders: {
    item_group_type_id: string;
    tier: number;
    unit_price_silver: number;
    amount: number;
  }[]
): EnchantmentUpgradeResourcePricesByTier {
  const enchantmentUpgradeResourcePrices: EnchantmentUpgradeResourcePricesByTier =
    {
      4: [[], [], []],
      5: [[], [], []],
      6: [[], [], []],
      7: [[], [], []],
      8: [[], [], []],
    };
  sellOrders.forEach((order) => {
    const itemEnding = order.item_group_type_id.split("_").pop();
    if (
      itemEnding === "RUNE" ||
      itemEnding === "SOUL" ||
      itemEnding === "RELIC"
    ) {
      const tier = order.tier.toString();
      if (
        tier !== "4" &&
        tier !== "5" &&
        tier !== "6" &&
        tier !== "7" &&
        tier !== "8"
      ) {
        throw new Error(
          `Invalid tier: ${tier} for order ${JSON.stringify(order)}`
        );
      }
      const mappedOrder: EnchantmentUpgradeItem = {
        amount: order.amount,
        price: order.unit_price_silver,
      };
      switch (itemEnding) {
        case "RUNE":
          enchantmentUpgradeResourcePrices[tier][0].push(mappedOrder);
          break;
        case "SOUL":
          enchantmentUpgradeResourcePrices[tier][1].push(mappedOrder);
          break;
        case "RELIC":
          enchantmentUpgradeResourcePrices[tier][2].push(mappedOrder);
          break;
      }
    }
  });

  for (let i = 0; i < 3; i++) {
    enchantmentUpgradeResourcePrices[4][i].sort((a, b) => a.price - b.price);
    enchantmentUpgradeResourcePrices[5][i].sort((a, b) => a.price - b.price);
    enchantmentUpgradeResourcePrices[6][i].sort((a, b) => a.price - b.price);
    enchantmentUpgradeResourcePrices[7][i].sort((a, b) => a.price - b.price);
    enchantmentUpgradeResourcePrices[8][i].sort((a, b) => a.price - b.price);
  }
  return enchantmentUpgradeResourcePrices;
}

export {
  expectedEnchantmentUpgradeCost,
  expectedQualityUpgradeCost,
  getEnchantmentUpgradeResourcePrices,
};
