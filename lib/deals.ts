import { getItemCategory, getItemValue } from "@/utils/items";
import { groupBy } from "@/utils/utils";
import {
  EnchantmentUpgradeItem,
  expectedEnchantmentUpgradeCost,
  expectedQualityUpgradeCost,
  getEnchantmentUpgradeResourcePrices,
} from "./upgradeCosts";

type SellOrder = {
  id: number;
  item_type_id: string;
  item_group_type_id: string;
  tier: number;
  enchantment_level: number;
  quality_level: number;
  unit_price_silver: number;
  created_at: Date;
  amount: number;
  location_id: number;
};
type BuyOrder = {
  id: number;
  item_type_id: string;
  item_group_type_id: string;
  enchantment_level: number;
  quality_level: number;
  unit_price_silver: number;
  created_at: Date;
  amount: number;
  location_id: number;
};
type FindDealsInput = {
  sellOrders: SellOrder[];
  buyOrders: BuyOrder[];
  premium: boolean;
  minProfit: number;
  minPercentualProfit: number;
  profitGate: "and" | "or";
  qualityUpgrade: boolean;
  enchantmentUpgrade: boolean;
};

export type DealOrderCounts = {
  sellOrders: number;
  buyOrders: number;
  potentialDeals: number;
};

function getPotentialDeals(params: FindDealsInput): Array<{
  sellOrder: SellOrder;
  buyOrder: BuyOrder;
  profit: number;
  percentualProfit: number;
  qualityUpgrade: boolean;
  qualityUpgradeCost?: number;
  enchantmentUpgrade: boolean;
  enchantmentUpgradeCost?: number;
  enchantmentUpgradeShoppingList?: EnchantmentUpgradeItem[][];
}> {
  const {
    sellOrders,
    buyOrders,
    premium,
    minProfit,
    minPercentualProfit,
    profitGate,
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
        const profit =
          buyOrder.unit_price_silver -
          sellOrder.unit_price_silver -
          buyOrder.unit_price_silver * (premium ? 0.04 : 0.08); // Subtract premium fee
        const percentualProfit = (profit / sellOrder.unit_price_silver) * 100;
        if (
          !(profitGate === "and"
            ? profit > minProfit && percentualProfit > minPercentualProfit
            : profit > minProfit || percentualProfit > minPercentualProfit)
        ) {
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
            percentualProfit,
            qualityUpgrade: false,
            enchantmentUpgrade: false,
          });
        }

        let qualityUpgradeCost: number | undefined = undefined;
        let enchantmentUpgradeCost: number | undefined = undefined;
        let enchantmentUpgradeShoppingList:
          | EnchantmentUpgradeItem[][]
          | undefined = undefined;
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
          const qualityUpgradePercentualProfit =
            (qualityUpgradeProfit / sellOrder.unit_price_silver) * 100;
          if (
            profitGate === "and"
              ? qualityUpgradeProfit > minProfit &&
                qualityUpgradePercentualProfit > minPercentualProfit
              : qualityUpgradeProfit > minProfit ||
                qualityUpgradePercentualProfit > minPercentualProfit
          ) {
            potentialDeals.push({
              sellOrder,
              buyOrder,
              profit: qualityUpgradeProfit,
              percentualProfit: qualityUpgradePercentualProfit,
              qualityUpgrade,
              enchantmentUpgrade: false,
              qualityUpgradeCost,
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
            const { totalCost: upgradeCost, shoppingList } =
              expectedEnchantmentUpgradeCost(
                sellOrder.enchantment_level,
                buyOrder.enchantment_level,
                getItemCategory(buyOrder.item_group_type_id),
                enchantedUpgradeItems[tier]
              ) || {};
            if (upgradeCost) {
              enchantmentUpgradeCost = upgradeCost;
              enchantmentUpgradeShoppingList = shoppingList;
              const enchantmentUpgradeProfit = profit - enchantmentUpgradeCost;
              const enchantmentUpgradePercentualProfit =
                (enchantmentUpgradeProfit / sellOrder.unit_price_silver) * 100;
              if (
                profitGate === "and"
                  ? enchantmentUpgradeProfit > minProfit &&
                    enchantmentUpgradePercentualProfit > minPercentualProfit
                  : enchantmentUpgradeProfit > minProfit ||
                    enchantmentUpgradePercentualProfit > minPercentualProfit
              ) {
                potentialDeals.push({
                  sellOrder,
                  buyOrder,
                  profit: enchantmentUpgradeProfit,
                  percentualProfit: enchantmentUpgradePercentualProfit,
                  qualityUpgrade: false,
                  enchantmentUpgrade,
                  enchantmentUpgradeCost,
                  enchantmentUpgradeShoppingList,
                });
              }
            }
          }
        }
        if (qualityUpgradeCost && enchantmentUpgradeCost) {
          const totalUpgradeProfit =
            profit - qualityUpgradeCost - enchantmentUpgradeCost;
          const totalUpgradePercentualProfit =
            (totalUpgradeProfit / sellOrder.unit_price_silver) * 100;
          if (
            profitGate === "and"
              ? totalUpgradeProfit > minProfit &&
                totalUpgradePercentualProfit > minPercentualProfit
              : totalUpgradeProfit > minProfit ||
                totalUpgradePercentualProfit > minPercentualProfit
          ) {
            potentialDeals.push({
              sellOrder,
              buyOrder,
              profit: totalUpgradeProfit,
              percentualProfit: totalUpgradePercentualProfit,
              qualityUpgrade: true,
              enchantmentUpgrade: true,
              qualityUpgradeCost,
              enchantmentUpgradeCost,
              enchantmentUpgradeShoppingList,
            });
          }
        }
      });
    });
  });

  potentialDeals.sort((a, b) => b.profit - a.profit); // Highest profit first
  return potentialDeals;
}

function getDeals(params: FindDealsInput): {
  deals: Array<{
    orders: ReturnType<typeof getPotentialDeals>[number];
    amount: number;
  }>;
  potentialDealsCount: number;
} {
  const potentialDeals = getPotentialDeals(params);
  const deals: ReturnType<typeof getDeals>["deals"] = [];
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
  return {
    deals,
    potentialDealsCount: potentialDeals.length,
  };
}

export { getDeals };
