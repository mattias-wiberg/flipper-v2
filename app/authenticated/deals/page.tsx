import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getDeals } from "@/lib/deals";
import { getItemName } from "@/utils/items";
import { createClient } from "@/utils/supabase/server";
import { parseDealSearchParams } from "@/utils/utils";
import { getWorldName } from "@/utils/worlds";
import { Info } from "lucide-react";
import Link from "next/link";
import { columns } from "./components/columns";
import { DataTable } from "./components/data-table";
import { Deal } from "./data/schema";

export default async function Deals({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string }>;
}) {
  const supabase = await createClient();

  const params = await searchParams;
  const { tier, minProfit, qualityUpgrade, enchantmentUpgrade, premium } =
    parseDealSearchParams(params);

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

  let buyOrderQuery = supabase
    .from("orders")
    .select(
      "item_type_id, location_id, item_group_type_id, enchantment_level, quality_level, unit_price_silver, amount"
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
      "item_type_id, location_id, item_group_type_id, tier, enchantment_level, quality_level, unit_price_silver, amount"
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
    tier: deal.orders.sellOrder.tier.toString(),
    profit: deal.orders.profit,
    qualityUpgradeRequired: deal.orders.qualityUpgrade,
    qualityUpgradeCost: deal.orders.qualityUpgradeCost,
    enchantmentUpgradeRequired: deal.orders.enchantmentUpgrade,
    enchantmentUpgradeCost: deal.orders.enchantmentUpgradeCost,
    enchantmentUpgradeShoppingList: deal.orders.enchantmentUpgradeShoppingList,
    buyOrder: {
      location: getWorldName(deal.orders.buyOrder.location_id),
      itemTypeId: deal.orders.buyOrder.item_type_id,
      enchantmentLevel: deal.orders.buyOrder.enchantment_level,
      qualityLevel: deal.orders.buyOrder.quality_level,
      price: deal.orders.buyOrder.unit_price_silver,
    },
    sellOrder: {
      location: getWorldName(deal.orders.sellOrder.location_id),
      itemTypeId: deal.orders.sellOrder.item_type_id,
      enchantmentLevel: deal.orders.sellOrder.enchantment_level,
      qualityLevel: deal.orders.sellOrder.quality_level,
      price: deal.orders.sellOrder.unit_price_silver,
    },
  }));

  return (
    <div className="flex-1 w-full max-w-6xl flex flex-col mx-auto py-8">
      {tableData.length === 0 && (
        <div className="w-full mb-6">
          <Alert className="w-full border-blue900/30 bg-blue-900/10 dark:bg-blue-900/10 dark:border-blue-900/40 flex flex-row items-center">
            <Info className="w-5 h-5" />
            <div className="flex-1">
              <AlertDescription>
                No deals were found with your current data. To get started, go
                to the{" "}
                <Link href="/authenticated/token" className="underline ">
                  token page
                </Link>{" "}
                and scan your market data using the{" "}
                <Link
                  href="https://www.albion-online-data.com/"
                  className="underline"
                >
                  Albion Data Client
                </Link>
                .
              </AlertDescription>
            </div>
            <Link href="/authenticated/token">
              <Button
                size="sm"
                variant="ghost"
                className="font-bold hover:bg-blue-900/10"
              >
                Token Page
              </Button>
            </Link>
          </Alert>
        </div>
      )}
      <DataTable data={tableData} columns={columns} />
    </div>
  );
}
