import { bodySchema } from "@/lib/orderSchemas";
import { promises as fs } from "fs";
import path from "path";

const ORDERS_FILE = path.join(process.cwd(), "mocker", "data", "orders.json");

export async function POST(request: Request) {
  try {
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

    // Read the current orders.json
    let ordersData;
    try {
      const fileContent = await fs.readFile(ORDERS_FILE, "utf-8");
      ordersData = JSON.parse(fileContent);
    } catch (e) {
      // If file does not exist or is invalid, start with empty array
      ordersData = [];
    }

    // Append the new orders as a new entry in the array
    ordersData.push({ Orders: parseResult.data.Orders });

    // Write back to the file
    await fs.writeFile(
      ORDERS_FILE,
      JSON.stringify(ordersData, null, 2),
      "utf-8"
    );

    return new Response("Orders appended successfully", { status: 200 });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
