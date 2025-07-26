import { getDeals } from "@/lib/deals";
import { createClient } from "@/utils/supabase/server";

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
  const qualityUpgrade = params.qualityUpgrade || false;
  const enchantmentUpgrade = params.enchantmentUpgrade || false;
  const premium = params.premium || false;

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

  const deals = getDeals({
    sellOrders: sellOrders.data,
    buyOrders: buyOrders.data,
    premium,
    minProfit,
    qualityUpgrade,
    enchantmentUpgrade,
  });

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
      <h3>Deals</h3>
      <p>{deals.length}</p>
      <pre>{JSON.stringify(deals, null, 2)}</pre>
    </div>
  );
}
