import { ItemCategory } from "@/lib/items";
import { findItemCategory } from "@/utils/items";
import { createClient } from "@/utils/supabase/server";
import { groupBy } from "@/utils/utils";

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
  itemValue: number = 1
): number {
  if (fromQuality < 1 || fromQuality > 5 || toQuality < 1 || toQuality > 5) {
    throw new Error("Quality levels must be between 1 and 5.");
  }

  if (fromQuality >= toQuality) {
    return 0.0;
  }

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

  return expectedCostVectors[toQuality - 2][fromQuality - 1] * itemValue;
}

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
    return 92;
  } else {
    throw new Error(
      `Unknown item category for enchantment upgrade amount: ${itemCategory}`
    );
  }
}

function expectedEnchantmentUpgradeCost(
  fromEnchantment: number,
  toEnchantment: number,
  itemCategory: ItemCategory
): number {
  if (toEnchantment <= fromEnchantment) {
    return 0.0;
  }

  if (fromEnchantment < 0 || toEnchantment < 0) {
    throw new Error("Enchantment levels must be positive.");
  }
  if (toEnchantment > 3) {
    throw new Error("Enchantment levels can only be enchanted up to level 3.");
  }

  const N = enchantmentUpgradeAmount(itemCategory);
  // TODO: Change costs to be fetched from database and be item tier specific
  const costs = [15, 200, 3500]; // rune, soul, relic
  let cost = 0;
  for (let i = fromEnchantment; i < toEnchantment; i++) {
    cost += costs[i] * N;
  }
  return cost;
}

export default async function Deals({
  searchParams,
}: {
  searchParams: Promise<{
    tier?: number;
    minProfit?: number;
    qualityUpgrade?: boolean;
    enchantmentUpgrade?: boolean;
    premium?: boolean;
  }>;
}) {
  const supabase = await createClient();

  const params = await searchParams;
  const { tier, qualityUpgrade, enchantmentUpgrade, premium } = params;
  const minProfit = params.minProfit ?? 0;

  let buyOrderQuery = supabase
    .from("orders")
    .select(
      "item_group_type_id, enchantment_level, quality_level, unit_price_silver, amount"
    )
    .eq("action_type", "request");
  if (tier) {
    buyOrderQuery = buyOrderQuery.eq("tier", tier);
  }
  const buyOrders = await buyOrderQuery;
  if (buyOrders.error) {
    console.error("Error fetching buy orders:", buyOrders.error);
    return <div>Error fetching buy orders</div>;
  }
  const groupedBuyOrdersByItemGroup = groupBy(
    buyOrders.data,
    (order) => order.item_group_type_id
  );

  let sellOrderQuery = supabase
    .from("orders")
    .select(
      "item_group_type_id, enchantment_level, quality_level, unit_price_silver, amount"
    )
    .eq("action_type", "offer");
  if (tier) {
    sellOrderQuery = sellOrderQuery.eq("tier", tier);
  }
  const sellOrders = await sellOrderQuery;
  if (sellOrders.error) {
    console.error("Error fetching sell orders:", sellOrders.error);
    return <div>Error fetching sell orders</div>;
  }
  const groupedSellOrdersByItemGroup = groupBy(
    sellOrders.data,
    (order) => order.item_group_type_id
  );

  const potentialDeals: Array<{
    sellOrder: (typeof sellOrders.data)[number];
    buyOrder: (typeof buyOrders.data)[number];
    profit: number;
    qualityUpgrade: boolean;
    enchantmentUpgrade: boolean;
  }> = [];
  Object.keys(groupedBuyOrdersByItemGroup).forEach((itemGroup) => {
    const itemSellOrders = groupedSellOrdersByItemGroup[itemGroup];
    const buyOrders = groupedBuyOrdersByItemGroup[itemGroup];
    if (!itemSellOrders || !buyOrders) {
      return; // No matching item group orders
    }
    itemSellOrders.forEach((sellOrder) => {
      buyOrders.forEach((buyOrder) => {
        if (
          buyOrder.enchantment_level > 3 &&
          sellOrder.enchantment_level !== buyOrder.enchantment_level
        ) {
          return; // Impossible to match enchantment levels
        }
        let profit = buyOrder.unit_price_silver - sellOrder.unit_price_silver;
        if (profit < minProfit) {
          return;
        }
        if (
          sellOrder.quality_level >= buyOrder.quality_level &&
          sellOrder.enchantment_level === buyOrder.enchantment_level
        ) {
          potentialDeals.push({
            sellOrder,
            buyOrder,
            profit,
            qualityUpgrade: false,
            enchantmentUpgrade: false,
          });
        }

        let qualityUpgradeCost = 0;
        let enchantmentUpgradeCost = 0;
        if (
          qualityUpgrade &&
          sellOrder.enchantment_level === buyOrder.enchantment_level
        ) {
          qualityUpgradeCost = expectedQualityUpgradeCost(
            sellOrder.quality_level,
            buyOrder.quality_level,
            1 // TODO: Replace with actual item value
          );
          const qualityUpgradeProfit = profit - qualityUpgradeCost;
          if (qualityUpgradeProfit > minProfit) {
            potentialDeals.push({
              sellOrder,
              buyOrder,
              profit: qualityUpgradeProfit,
              qualityUpgrade,
              enchantmentUpgrade: false,
            });
          }
        }
        if (
          enchantmentUpgrade &&
          sellOrder.enchantment_level < buyOrder.enchantment_level &&
          sellOrder.quality_level >= buyOrder.quality_level
        ) {
          enchantmentUpgradeCost = expectedEnchantmentUpgradeCost(
            sellOrder.enchantment_level,
            buyOrder.enchantment_level,
            findItemCategory(buyOrder.item_group_type_id)
          );
          const enchantmentUpgradeProfit = profit - enchantmentUpgradeCost;
          if (enchantmentUpgradeProfit > minProfit) {
            potentialDeals.push({
              sellOrder,
              buyOrder,
              profit: enchantmentUpgradeProfit,
              qualityUpgrade: false,
              enchantmentUpgrade,
            });
          }
        }
        if (
          enchantmentUpgrade &&
          sellOrder.enchantment_level < buyOrder.enchantment_level &&
          qualityUpgrade
        ) {
          const totalUpgradeProfit =
            profit - qualityUpgradeCost - enchantmentUpgradeCost;
          if (totalUpgradeProfit > minProfit) {
            potentialDeals.push({
              sellOrder,
              buyOrder,
              profit: totalUpgradeProfit,
              qualityUpgrade,
              enchantmentUpgrade,
            });
          }
        }
      });
    });
  });

  potentialDeals.sort((a, b) => b.profit - a.profit); // Highest profit first
  const deals = [];
  for (const deal of potentialDeals) {
    if (deal.buyOrder.amount > 0 && deal.sellOrder.amount > 0) {
      const amount = Math.min(deal.buyOrder.amount, deal.sellOrder.amount);
      deals.push({ deal, amount });
      // Mutate the order references amounts to reflect taking the deal
      deal.buyOrder.amount -= amount;
      deal.sellOrder.amount -= amount;
    }
  }

  return (
    <div>
      <h1>Deals</h1>
      <p>
        Tier: {tier || "All"} <br />
        Min Profit: {minProfit || "None"} <br />
        Quality Upgrade: {qualityUpgrade ? "Enabled" : "Disabled"} <br />
        Enchantment Upgrade: {enchantmentUpgrade ? "Enabled" : "Disabled"}{" "}
        <br />
        Premium: {premium ? "Enabled" : "Disabled"} <br />
      </p>
      <h3>Potential Deals</h3>
      <p>{potentialDeals.length}</p>
      <pre>{JSON.stringify(potentialDeals.splice(0, 5), null, 2)}</pre>
      <h3>Deals</h3>
      <p>{deals.length}</p>
      <pre>{JSON.stringify(deals.splice(0, 5), null, 2)}</pre>
    </div>
  );
}
