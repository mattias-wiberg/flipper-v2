import { getDeals } from "@/lib/deals";
import { getItemName } from "@/utils/items";
import { createClient } from "@/utils/supabase/server";
import { columns } from "./components/columns";
import { DataTable } from "./components/data-table";
import { Deal } from "./data/schema";

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
  const { tier } = params;
  const minProfit = params.minProfit ?? 0;
  const qualityUpgrade = params.qualityUpgrade || true;
  const enchantmentUpgrade = params.enchantmentUpgrade || true;
  console.log(
    "Fetching deals with params:",
    params,
    "minProfit:",
    minProfit,
    "qualityUpgrade:",
    qualityUpgrade,
    "enchantmentUpgrade:",
    enchantmentUpgrade
  );
  const premium = params.premium || false;

  let buyOrderQuery = supabase
    .from("orders")
    .select(
      "item_type_id, item_group_type_id, enchantment_level, quality_level, unit_price_silver, amount"
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

  let sellOrderQuery = supabase
    .from("orders")
    .select(
      "item_type_id, item_group_type_id, tier, enchantment_level, quality_level, unit_price_silver, amount"
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

  const deals = getDeals({
    sellOrders: sellOrders.data,
    buyOrders: buyOrders.data,
    premium,
    minProfit,
    qualityUpgrade,
    enchantmentUpgrade,
  });
  const tableData: Deal[] = deals.map((deal) => ({
    amount: deal.amount,
    name: getItemName(deal.orders.buyOrder.item_group_type_id),
    tier: deal.orders.sellOrder.tier,
    profit: deal.orders.profit,
    enchantmentUpgradeRequired: deal.orders.enchantmentUpgrade,
    qualityUpgradeRequired: deal.orders.qualityUpgrade,
    buyOrder: {
      itemTypeId: deal.orders.buyOrder.item_type_id,
      enchantmentLevel: deal.orders.buyOrder.enchantment_level,
      qualityLevel: deal.orders.buyOrder.quality_level,
      price: deal.orders.buyOrder.unit_price_silver,
    },
    sellOrder: {
      itemTypeId: deal.orders.sellOrder.item_type_id,
      enchantmentLevel: deal.orders.sellOrder.enchantment_level,
      qualityLevel: deal.orders.sellOrder.quality_level,
      price: deal.orders.sellOrder.unit_price_silver,
    },
  }));

  return <DataTable data={tableData} columns={columns} />;
}
