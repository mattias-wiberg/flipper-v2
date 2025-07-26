import {
  EnchantmentUpgradeItem,
  expectedEnchantmentUpgradeCost,
  expectedQualityUpgradeCost,
} from "@/lib/deals";
import { getItemCategory, getItemName, getItemValue } from "@/utils/items";
import { createClient } from "@/utils/supabase/server";
import { groupBy } from "@/utils/utils";

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
      "item_group_type_id, tier, enchantment_level, quality_level, unit_price_silver, amount"
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

  const enchantedUpgradeItems: { [tier: string]: EnchantmentUpgradeItem[][] } =
    sellOrders.data.reduce(
      (acc, order) => {
        const itemEnding = order.item_group_type_id.split("_").pop();
        if (
          itemEnding === "RUNE" ||
          itemEnding === "SOUL" ||
          itemEnding === "RELIC"
        ) {
          const tier = order.tier.toString();
          const mappedOrder: EnchantmentUpgradeItem = {
            amount: order.amount,
            price: order.unit_price_silver,
          };
          switch (itemEnding) {
            case "RUNE":
              acc[tier][0].push(mappedOrder);
              break;
            case "SOUL":
              acc[tier][1].push(mappedOrder);
              break;
            case "RELIC":
              acc[tier][2].push(mappedOrder);
              break;
          }
        }
        return acc;
      },
      {
        4: [[], [], []],
        5: [[], [], []],
        6: [[], [], []],
        7: [[], [], []],
        8: [[], [], []],
      } as Record<string, EnchantmentUpgradeItem[][]>
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

        let qualityUpgradeCost = 0;
        let enchantmentUpgradeCost = 0;
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
          const upgradeCost = expectedEnchantmentUpgradeCost(
            sellOrder.enchantment_level,
            buyOrder.enchantment_level,
            getItemCategory(buyOrder.item_group_type_id),
            enchantedUpgradeItems[sellOrder.tier.toString()]
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
  const deals: Array<{
    orders: (typeof potentialDeals)[number];
    amount: number;
    name: string;
  }> = [];
  for (const deal of potentialDeals) {
    if (deal.buyOrder.amount > 0 && deal.sellOrder.amount > 0) {
      const amount = Math.min(deal.buyOrder.amount, deal.sellOrder.amount);
      deals.push({
        orders: deal,
        name: getItemName(deal.sellOrder.item_group_type_id),
        amount,
      });
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
        Quality Upgrade: {qualityUpgrade ? "True" : "False"} <br />
        Enchantment Upgrade: {enchantmentUpgrade ? "True" : "False"} <br />
        Premium: {premium ? "True" : "False"} <br />
      </p>
      {/* <h3>Potential Deals</h3>
      <p>{potentialDeals.length}</p>
      <pre>{JSON.stringify(potentialDeals.splice(0, 5), null, 2)}</pre> */}
      <h3>Deals</h3>
      <p>{deals.length}</p>
      <pre>{JSON.stringify(deals, null, 2)}</pre>
    </div>
  );
}
