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
  itemValue: z.number().min(0),
});

const itemsSchema = z.record(itemSchema);
type ItemType = z.infer<typeof itemSchema>;

// Load and cache the JSON from public/formattedItems.json
let cachedItems: Record<string, ItemType> | undefined;
function getItems(): Record<string, ItemType> {
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
function getItemCategory(itemTypeId: string): ItemCategory {
  const items = getItems();
  if (items[itemTypeId]) {
    return items[itemTypeId].category;
  } else {
    throw new Error(
      `Item type ID ${itemTypeId} not found in formattedItems.json`
    );
  }
}

/**
 * Gets the item value for a given item_type_id (@uniquename) from items.json.
 * @param itemTypeId The unique name of the item (@uniquename)
 * @returns The item value or throws an error if not found.
 */
function getItemValue(itemTypeId: string): number {
  const items = getItems();
  if (items[itemTypeId]) {
    return items[itemTypeId].itemValue;
  } else {
    throw new Error(
      `Item type ID ${itemTypeId} not found or missing itemValue in formattedItems.json`
    );
  }
}

/**
 * Gets the item name for a given item_type_id (@uniquename) from items.json.
 * @param itemTypeId The unique name of the item (@uniquename)
 * @returns The item name or throws an error if not found.
 */
function getItemName(itemTypeId: string): string {
  const items = getItems();
  if (items[itemTypeId]) {
    return items[itemTypeId].name;
  } else {
    throw new Error(
      `Item type ID ${itemTypeId} not found or missing name in formattedItems.json`
    );
  }
}

export { getItemCategory, getItemName, getItemValue };
