import { getItemCategory, getItemValue } from "@/utils/items";
import { groupBy } from "@/utils/utils";
import {
  expectedEnchantmentUpgradeCost,
  expectedQualityUpgradeCost,
  getEnchantmentUpgradeResourcePrices,
} from "./upgradeCosts";

type SellOrder = {
  item_type_id: string;
  item_group_type_id: string;
  tier: number;
  enchantment_level: number;
  quality_level: number;
  unit_price_silver: number;
  amount: number;
};
type BuyOrder = {
  item_type_id: string;
  item_group_type_id: string;
  enchantment_level: number;
  quality_level: number;
  unit_price_silver: number;
  amount: number;
};
type FindDealsInput = {
  sellOrders: SellOrder[];
  buyOrders: BuyOrder[];
  premium: boolean;
  minProfit: number;
  qualityUpgrade: boolean;
  enchantmentUpgrade: boolean;
};

function getPotentialDeals(params: FindDealsInput): Array<{
  sellOrder: SellOrder;
  buyOrder: BuyOrder;
  profit: number;
  qualityUpgrade: boolean;
  enchantmentUpgrade: boolean;
}> {
  const {
    sellOrders,
    buyOrders,
    premium,
    minProfit,
    qualityUpgrade,
    enchantmentUpgrade,
  } = params;
  const enchantedUpgradeItems = getEnchantmentUpgradeResourcePrices(sellOrders);
  const potentialDeals: ReturnType<typeof getPotentialDeals> = [];

  const groupedBuyOrdersByItemGroup = groupBy(
    buyOrders,
    (order) => order.item_group_type_id
  );
  const groupedSellOrdersByItemGroup = groupBy(
    sellOrders,
    (order) => order.item_group_type_id
  );

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
        let profit =
          buyOrder.unit_price_silver -
          sellOrder.unit_price_silver -
          buyOrder.unit_price_silver * (premium ? 0.04 : 0.08); // Subtract premium fee
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

        let qualityUpgradeCost = null;
        let enchantmentUpgradeCost = null;
        if (
          qualityUpgrade &&
          sellOrder.enchantment_level === buyOrder.enchantment_level
        ) {
          qualityUpgradeCost = expectedQualityUpgradeCost(
            sellOrder.quality_level,
            buyOrder.quality_level,
            getItemValue(buyOrder.item_group_type_id)
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
          const tier = sellOrder.tier.toString();
          if (
            tier === "4" ||
            tier === "5" ||
            tier === "6" ||
            tier === "7" ||
            tier === "8"
          ) {
            const upgradeCost = expectedEnchantmentUpgradeCost(
              sellOrder.enchantment_level,
              buyOrder.enchantment_level,
              getItemCategory(buyOrder.item_group_type_id),
              enchantedUpgradeItems[tier]
            );
            if (upgradeCost) {
              enchantmentUpgradeCost = upgradeCost;
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
          }
        }
        if (qualityUpgradeCost !== null && enchantmentUpgradeCost !== null) {
          const totalUpgradeProfit =
            profit - qualityUpgradeCost - enchantmentUpgradeCost;
          if (totalUpgradeProfit > minProfit) {
            potentialDeals.push({
              sellOrder,
              buyOrder,
              profit: totalUpgradeProfit,
              qualityUpgrade: true,
              enchantmentUpgrade: true,
            });
          }
        }
      });
    });
  });

  potentialDeals.sort((a, b) => b.profit - a.profit); // Highest profit first
  return potentialDeals;
}

function getDeals(params: FindDealsInput): Array<{
  orders: ReturnType<typeof getPotentialDeals>[number];
  amount: number;
}> {
  const potentialDeals = getPotentialDeals(params);
  const deals: ReturnType<typeof getDeals> = [];
  for (const deal of potentialDeals) {
    if (deal.buyOrder.amount > 0 && deal.sellOrder.amount > 0) {
      const amount = Math.min(deal.buyOrder.amount, deal.sellOrder.amount);
      deals.push({
        orders: deal,
        amount,
      });
      // Mutate the order references amounts to reflect taking the deal
      deal.buyOrder.amount -= amount;
      deal.sellOrder.amount -= amount;
    }
  }
  return deals;
}

export { getDeals };
