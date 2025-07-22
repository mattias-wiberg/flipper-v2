import { ItemCategory } from "@/lib/items";
import fs from "fs";
import path from "path";
import { z } from "zod";

const itemSchema = z.object({
  category: z.enum([
    "2H-weapon",
    "1H-weapon",
    "armors",
    "bags",
    "head",
    "shoes",
    "capes",
    "offhands",
  ]),
  name: z.string(),
});

const itemsSchema = z.record(itemSchema);

// Load and cache the JSON from public/formattedItems.json

let cachedItems:
  | Record<string, { category: ItemCategory; name: string }>
  | undefined;
function getItems(): Record<string, { category: ItemCategory; name: string }> {
  if (!cachedItems) {
    const itemsJsonPath = path.join(
      process.cwd(),
      "public",
      "formattedItems.json"
    );
    const raw = fs.readFileSync(itemsJsonPath, "utf-8");
    // Validate and parse using Zod
    cachedItems = itemsSchema.parse(JSON.parse(raw));
  }
  return cachedItems!;
}

/**
 * Finds the item category (@shopcategory) for a given item_type_id (@uniquename) from items.json.
 * @param itemTypeId The unique name of the item (@uniquename)
 * @returns The item category (@shopcategory) or throws an error if not found.
 */
function findItemCategory(itemTypeId: string): ItemCategory {
  const items = getItems();
  if (items[itemTypeId]) {
    return items[itemTypeId].category;
  } else {
    throw new Error(
      `Item type ID ${itemTypeId} not found in formattedItems.json`
    );
  }
}

export { findItemCategory };
