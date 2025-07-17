import { createClient } from "@/utils/supabase/server";

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

  if (fromQuality < 1 || fromQuality > 5 || toQuality < 1 || toQuality > 5) {
    throw new Error("Quality levels must be between 1 and 5.");
  }

  if (fromQuality >= toQuality) {
    return 0.0;
  }

  return expectedCostVectors[toQuality - 2][fromQuality - 1] * itemValue;
}

export default async function Deals({
  searchParams,
}: {
  searchParams: Promise<{ tier?: number; minProfit?: number }>;
}) {
  const supabase = await createClient();
  const { tier, minProfit } = await searchParams;
  console.log("Query parameters:", { tier, minProfit });

  let query = supabase.from("orders").select("*");
  if (tier) {
    query = query.eq("tier", tier);
  }
  const orders = await query;

  return <pre>{JSON.stringify(orders, null, 2)}</pre>;
}
