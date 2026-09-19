const fs = require("fs");
const path = require("path");

const categories = {
  "1H-weapon": "1H-weapon",
  "2H-weapon": "2H-weapon",
  armors: "armors",
  bags: "bags",
  head: "head",
  shoes: "shoes",
  capes: "capes",
  offhands: "offhands",
};

const itemNamesPath = path.join(__dirname, "items.txt");
const itemDataPath = path.join(__dirname, "items.json");
const outputPath = path.resolve(
  __dirname,
  "..",
  "public",
  "formattedItems.json",
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  return value ? [value] : [];
}

function parseItemNames(raw) {
  const itemNames = {};

  for (const line of raw.split(/\r?\n/)) {
    // The dump contains an optional line number before the item ID.
    const match = line.match(/^\s*(?:\d+\s*:\s*)?([^:]+?)\s*:\s*(.*?)\s*$/);
    if (!match) {
      continue;
    }

    const id = match[1].trim();
    const name = match[2].trim();
    if (id && name) {
      itemNames[id] = name;
    }
  }

  return itemNames;
}

const itemNames = parseItemNames(fs.readFileSync(itemNamesPath, "utf8"));
const fullItems = readJson(itemDataPath);

if (!fullItems || Array.isArray(fullItems) || !fullItems.items) {
  throw new Error(
    "utils/items.json must be the raw Albion item dump. Run npm run sync:ao-dumps before formatting items.",
  );
}

const allItems = Object.values(fullItems.items).flatMap((group) =>
  Array.isArray(group) ? group : [],
);
const itemMap = allItems.reduce((map, item) => {
  if (item && item["@uniquename"]) {
    map[item["@uniquename"]] = item;
  }
  return map;
}, {});

const equipmentItems = [
  ...asArray(fullItems.items.transformationweapon),
  ...asArray(fullItems.items.weapon),
  ...asArray(fullItems.items.equipmentitem),
];

const formattedItems = {};
const unhandledSlotTypes = new Set();
const unhandledWeapons = new Set();
const unhandledCraftingResources = new Set();
const unhandledEquipment = new Set();

function getItemValue(item, visiting = new Set()) {
  if (!item || !item.craftingrequirements) {
    return null;
  }

  const requirements = Array.isArray(item.craftingrequirements)
    ? item.craftingrequirements.find(
        (requirement) => requirement && requirement.craftresource,
      )
    : item.craftingrequirements;
  const craftResources = requirements && requirements.craftresource;
  if (!craftResources) {
    return null;
  }

  const itemId = item["@uniquename"];
  if (itemId) {
    if (visiting.has(itemId)) {
      return null;
    }
    visiting = new Set(visiting);
    visiting.add(itemId);
  }

  let itemValue = 0;
  for (const resource of asArray(craftResources)) {
    const resourceId = resource["@uniquename"];
    if (!resourceId) {
      continue;
    }

    const count = Number.parseInt(resource["@count"], 10);
    if (!Number.isFinite(count)) {
      continue;
    }

    const resourceItem = itemMap[resourceId];
    if (!resourceItem) {
      unhandledCraftingResources.add(resourceId);
      continue;
    }

    const directValue = Number.parseInt(resourceItem["@itemvalue"], 10);
    if (Number.isFinite(directValue)) {
      itemValue += directValue * count;
      continue;
    }

    const nestedValue = getItemValue(resourceItem, visiting);
    if (nestedValue !== null) {
      itemValue += nestedValue * count;
    }
  }

  return itemValue;
}

function isTrue(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function getItemCategory(equipment) {
  switch (equipment["@slottype"]) {
    case "mainhand":
      if (equipment["@twohanded"] === undefined) {
        unhandledWeapons.add(equipment["@uniquename"]);
        return undefined;
      }
      return isTrue(equipment["@twohanded"])
        ? categories["2H-weapon"]
        : categories["1H-weapon"];
    case "armor":
      return categories.armors;
    case "shoes":
      return categories.shoes;
    case "cape":
      return categories.capes;
    case "bag":
      return categories.bags;
    case "head":
      return categories.head;
    case "offhand":
      return categories.offhands;
    default:
      unhandledSlotTypes.add(equipment["@slottype"] || "missing");
      return undefined;
  }
}

for (const equipment of equipmentItems) {
  const itemId = equipment["@uniquename"];
  if (!itemId) {
    unhandledEquipment.add("missing");
    continue;
  }

  const category = getItemCategory(equipment);
  const itemValue = getItemValue(equipment);
  const name = itemNames[itemId];

  if (category && itemValue !== null && name) {
    if (formattedItems[itemId]) {
      console.warn(
        `Duplicate item found: ${itemId}, overwriting previous value`,
      );
    }
    formattedItems[itemId] = {
      itemValue,
      category,
      name,
    };
  } else {
    unhandledEquipment.add(itemId);
  }
}

function reportUnhandled(label, values) {
  if (values.size === 0) {
    return;
  }
  const sample = [...values].slice(0, 10).join(", ");
  const suffix = values.size > 10 ? ", ..." : "";
  console.warn(`${label}: ${values.size} (${sample}${suffix})`);
}

reportUnhandled("Unhandled slot types", unhandledSlotTypes);
reportUnhandled("Unhandled weapons", unhandledWeapons);
reportUnhandled("Unhandled crafting resources", unhandledCraftingResources);
reportUnhandled("Unhandled equipment", unhandledEquipment);

fs.writeFileSync(outputPath, `${JSON.stringify(formattedItems, null, 2)}\n`);
console.log(
  `Formatted items saved to ${path.relative(process.cwd(), outputPath)} with ${Object.keys(formattedItems).length} items`,
);
