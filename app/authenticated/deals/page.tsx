import { getDeals } from "@/lib/deals";
import { getItemName } from "@/utils/items";
import { createClient } from "@/utils/supabase/server";
import { parseDealSearchParams } from "@/utils/utils";
import { getWorldName } from "@/utils/worlds";
import type { Metadata } from "next";
import { RealtimeDeals } from "./components/realtime-deals";

export const metadata: Metadata = {
  title: "Deals",
  description:
    "Live view of profitable Black Market flips based on your latest data.",
  alternates: { canonical: "/authenticated/deals" },
};

export default async function Deals({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const parsedParams = parseDealSearchParams(params);

  // Get initial data
  let buyOrderQuery = supabase
    .from("orders")
    .select(
      "id, item_type_id, location_id, item_group_type_id, enchantment_level, quality_level, unit_price_silver, amount, created_at"
    )
    .eq("action_type", "request");
  if (parsedParams.tier) {
    buyOrderQuery = buyOrderQuery.eq("tier", parsedParams.tier);
  }
  const buyOrders = await buyOrderQuery;
  if (buyOrders.error) {
    console.error("Error fetching buy orders:", buyOrders.error);
    return <div>Error fetching buy orders</div>;
  }

  let sellOrderQuery = supabase
    .from("orders")
    .select(
      "id, item_type_id, location_id, item_group_type_id, tier, enchantment_level, quality_level, unit_price_silver, amount, created_at"
    )
    .eq("action_type", "offer");
  if (parsedParams.tier) {
    sellOrderQuery = sellOrderQuery.eq("tier", parsedParams.tier);
  }
  const sellOrders = await sellOrderQuery;
  if (sellOrders.error) {
    console.error("Error fetching sell orders:", sellOrders.error);
    return <div>Error fetching sell orders</div>;
  }

  const { deals, potentialDealsCount } = getDeals({
    sellOrders: sellOrders.data.map((order) => ({
      ...order,
      created_at: new Date(order.created_at),
    })),
    buyOrders: buyOrders.data.map((order) => ({
      ...order,
      created_at: new Date(order.created_at),
    })),
    ...parsedParams,
  });

  const initialData = {
    deals: deals.map((deal) => ({
      amount: deal.amount,
      name: getItemName(deal.orders.buyOrder.item_group_type_id),
      tier: deal.orders.sellOrder.tier.toString(),
      profit: deal.orders.profit,
      percentualProfit: deal.orders.percentualProfit,
      qualityUpgradeRequired: deal.orders.qualityUpgrade,
      qualityUpgradeCost: deal.orders.qualityUpgradeCost,
      enchantmentUpgradeRequired: deal.orders.enchantmentUpgrade,
      enchantmentUpgradeCost: deal.orders.enchantmentUpgradeCost,
      enchantmentUpgradeShoppingList: deal.orders.enchantmentUpgradeShoppingList,
      buyOrder: {
        id: deal.orders.buyOrder.id,
        location: getWorldName(deal.orders.buyOrder.location_id),
        itemTypeId: deal.orders.buyOrder.item_type_id,
        enchantmentLevel: deal.orders.buyOrder.enchantment_level,
        qualityLevel: deal.orders.buyOrder.quality_level,
        price: deal.orders.buyOrder.unit_price_silver,
        createdAt: deal.orders.buyOrder.created_at,
      },
      sellOrder: {
        id: deal.orders.sellOrder.id,
        location: getWorldName(deal.orders.sellOrder.location_id),
        itemTypeId: deal.orders.sellOrder.item_type_id,
        enchantmentLevel: deal.orders.sellOrder.enchantment_level,
        qualityLevel: deal.orders.sellOrder.quality_level,
        price: deal.orders.sellOrder.unit_price_silver,
        createdAt: deal.orders.sellOrder.created_at,
      },
    })),
    counts: {
      sellOrders: sellOrders.data.length,
      buyOrders: buyOrders.data.length,
      potentialDeals: potentialDealsCount,
    },
  };

  return <RealtimeDeals initialData={initialData} searchParams={parsedParams} />;
}
