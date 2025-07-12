import { promises as fs } from "fs";
import path from "path";

const ordersFilePath = path.resolve(process.cwd(), "orders.json");

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const body = await request.json();

    console.log("Received token:", token);
    console.log("Received body:", body);

    // Read existing orders from file
    let existingOrders: any[] = [];
    try {
      const data = await fs.readFile(ordersFilePath, "utf-8");
      existingOrders = JSON.parse(data);
    } catch (err) {
      // If file doesn't exist, start with empty array
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }

    existingOrders.push(body);

    // Write updated orders back to file
    await fs.writeFile(
      ordersFilePath,
      JSON.stringify(existingOrders, null, 2),
      "utf-8"
    );

    return new Response("Ingestion successful", { status: 200 });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
