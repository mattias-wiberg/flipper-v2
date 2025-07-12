import { bodySchema } from "@/lib/orderSchemas";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const supabase = createAdminClient();

    // Validate token exists
    const { data, error: tokenError } = await supabase
      .from("tokens")
      .select("token")
      .eq("token", token)
      .single();

    if (tokenError || !data) {
      console.error("Token validation error:", tokenError);
      console.error("Token not found:", token);
      return new Response("Invalid token", { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response("Invalid JSON", { status: 400 });
    }

    const parseResult = bodySchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid body format",
          details: parseResult.error.errors,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let ordersToInsert = [];
    for (const order of parseResult.data.Orders) {
      const silver = order.UnitPriceSilver / 10000; // Convert to silver
      // Parse the tier from the order's item type ID
      const tierMatch = order.ItemTypeId.match(/T(\d+)/);
      if (tierMatch) {
        ordersToInsert.push({
          id: order.Id,
          item_type_id: order.ItemTypeId,
          item_group_type_id: order.ItemGroupTypeId,
          location_id: order.LocationId,
          tier: parseInt(tierMatch[1], 10),
          quality_level: order.QualityLevel,
          enchantment_level: order.EnchantmentLevel,
          unit_price_silver: silver,
          amount: order.Amount,
          action_type: order.AuctionType,
          expires: order.Expires,
          token: data.token,
        });
      } else {
        console.warn(
          `Order ${order.Id} has an invalid ItemTypeId format: ${order.ItemTypeId}`
        );
      }
    }
    // Map incoming order fields to DB fields
    const { error } = await supabase.from("orders").upsert(ordersToInsert, {
      ignoreDuplicates: true,
    });

    if (error) {
      console.error("Supabase insert error:", error);
      return new Response("Failed to ingest order", { status: 500 });
    }

    return new Response("Ingestion successful", { status: 200 });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
