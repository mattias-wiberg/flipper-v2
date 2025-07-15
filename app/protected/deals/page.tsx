import { createClient } from "@/utils/supabase/server";

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
