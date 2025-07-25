const f = require("fs");
const p = require("path");

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

const itemNamesJsonPath = p.resolve(__dirname, "items.txt");
const itemNamesRaw = f.readFileSync(itemNamesJsonPath, "utf-8");
const itemNames = itemNamesRaw.split("\n");
const fullItemsJsonPath = p.resolve(__dirname, "items.json");
const fullItemsRaw = f.readFileSync(fullItemsJsonPath, "utf-8");
const fullItems = JSON.parse(fullItemsRaw);

const itemNameMap = itemNames.reduce((acc, line) => {
  const match = line.split(":").map((s) => s.trim());
  acc[match[1]] = match[2];
  return acc;
}, {});

const simpleItemsMap = fullItems.items.simpleitem.reduce((acc, item) => {
  if (item["@uniquename"]) {
    acc[item["@uniquename"]] = {
      ...item,
    };
  }
  return acc;
}, {});
const equimentItems = [
  ...fullItems.items.transformationweapon,
  ...fullItems.items.weapon,
  ...fullItems.items.equipmentitem,
];
const equimentItemsMap = equimentItems.reduce((acc, item) => {
  if (item["@uniquename"]) {
    acc[item["@uniquename"]] = {
      ...item,
    };
  }
  return acc;
}, {});

const formattedItems = {};
const unhandledSlotTypes = new Set();
const unhandledWeapons = new Set();
const unhandledCraftingResources = new Set();
const unhandledEquiment = new Set();

function getItemValue(item) {
  if (!item.craftingrequirements) {
    return null;
  }

  const craftresources = Array.isArray(item.craftingrequirements)
    ? item.craftingrequirements[0].craftresource
    : item.craftingrequirements.craftresource;
  if (!craftresources) {
    return null;
  }

  let itemValue = 0;
  for (const resource of Array.isArray(craftresources)
    ? craftresources
    : [craftresources]) {
    if (resource["@uniquename"]) {
      if (simpleItemsMap[resource["@uniquename"]]) {
        const simpleItem = simpleItemsMap[resource["@uniquename"]];
        if (simpleItem["@itemvalue"]) {
          itemValue +=
            parseInt(simpleItem["@itemvalue"], 10) *
            parseInt(resource["@count"], 10);
        }
      } else {
        // Crafting resource might be another equiment item
        if (!equimentItemsMap[resource["@uniquename"]]) {
          unhandledCraftingResources.add(resource["@uniquename"]);
        } else {
          itemValue += getItemValue(equimentItemsMap[resource["@uniquename"]]);
        }
      }
    }
  }
  return itemValue;
}

function getItemCategory(equipment) {
  let category;
  switch (equipment["@slottype"]) {
    case "mainhand":
      if (equipment["@twohanded"]) {
        category = equipment["@twohanded"]
          ? categories["2H-weapon"]
          : categories["1H-weapon"];
      } else {
        unhandledWeapons.add(equipment["@uniquename"]);
      }
      break;
    case "armor":
      category = categories.armors;
      break;
    case "shoes":
      category = categories.shoes;
      break;
    case "cape":
      category = categories.capes;
      break;
    case "bag":
      category = categories.bags;
      break;
    case "head":
      category = categories.head;
      break;
    case "shoes":
      category = categories.shoes;
      break;
    case "offhand":
      category = categories.offhands;
      break;
    default:
      unhandledSlotTypes.add(equipment["@slottype"]);
      break;
  }
  return category;
}

for (const equipment of equimentItems) {
  if (!equipment["@uniquename"]) {
    console.warn("Equipment without @uniquename:", equipment);
  }
  if (!equipment["@shopcategory"]) {
    console.warn("Equipment without @shopcategory:", equipment["@uniquename"]);
  }
  const category = getItemCategory(equipment);
  const itemValue = getItemValue(equipment);
  const name = itemNameMap[equipment["@uniquename"]];
  if (category && itemValue !== null && name) {
    if (formattedItems[equipment["@uniquename"]]) {
      console.warn(
        `Duplicate item found: ${equipment["@uniquename"]}, overwriting category`
      );
    }
    formattedItems[equipment["@uniquename"]] = {
      ...formattedItems[equipment["@uniquename"]],
      itemValue,
      category,
      name,
    };
  } else {
    unhandledEquiment.add(equipment["@uniquename"]);
  }
}

// Remove any entries without a valid name property
for (const key of Object.keys(formattedItems)) {
  if (
    !formattedItems[key].name ||
    typeof formattedItems[key].name !== "string"
  ) {
    delete formattedItems[key];
  }
}

console.warn(
  "Unhandled slot types: ,",
  [...unhandledSlotTypes.values()].join("\n")
);
console.warn("Unhandled weapons:", [...unhandledWeapons.values()].join("\n"));
console.warn(
  "Unhandled crafting resources:",
  [...unhandledCraftingResources.values()].join("\n")
);
console.warn(
  "Unhandled equipment:",
  [...unhandledEquiment.values()].join("\n")
);
const publicPath = p.join(process.cwd(), "public", "formattedItems.json");
f.writeFileSync(publicPath, JSON.stringify(formattedItems, null, 2));
console.log(
  `Formatted items saved to public/formattedItems.json with ${Object.keys(formattedItems).length} items`
);
