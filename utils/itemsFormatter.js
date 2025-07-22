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

const formattedItems = {};
const unhandledSubcategories = new Set();
const unhandledCategories = new Set();
const unhandledWeapons = new Set();
for (const equipment of [
  ...fullItems.items.transformationweapon,
  ...fullItems.items.weapon,
  ...fullItems.items.equipmentitem,
]) {
  if (!equipment["@uniquename"]) {
    console.warn("Equipment without @uniquename:", equipment);
  }
  if (!equipment["@shopcategory"]) {
    console.warn("Equipment without @shopcategory:", equipment["@uniquename"]);
  }
  let category;
  switch (equipment["@shopcategory"]) {
    case "weapons":
      if (equipment["@twohanded"]) {
        category = equipment["@twohanded"]
          ? categories["2H-weapon"]
          : categories["1H-weapon"];
      } else {
        unhandledWeapons.add(equipment["@uniquename"]);
      }
      break;
    case "armors":
      category = categories.armors;
      break;
      break;
    case "shoes":
      category = categories.shoes;
      break;
    case "accessoires":
      switch (equipment["@shopsubcategory1"]) {
        case "capes":
          category = categories.capes;
          break;
        case "satchels":
        case "bags":
          category = categories.bags;
          break;
        default:
          unhandledSubcategories.add(equipment["@shopsubcategory1"]);
          break;
      }
      break;
    case "head":
      category = categories.head;
      break;
    case "shoes":
      category = categories.shoes;
      break;
    case "offhands":
      category = categories.offhands;
      break;
    default:
      unhandledCategories.add(equipment["@shopcategory"]);
      break;
  }
  if (category) {
    if (formattedItems[equipment["@uniquename"]]) {
      console.warn(
        `Duplicate item found: ${equipment["@uniquename"]}, overwriting category`
      );
    }
    formattedItems[equipment["@uniquename"]] = {
      ...formattedItems[equipment["@uniquename"]],
      category,
    };
  }
}

for (const itemNameLine of itemNames) {
  const match = itemNameLine.match(/^\d+:\s+(\w+)\s+:\s+(.+)$/);
  if (match) {
    const id = match[1];
    const name = match[2];
    if (formattedItems[id]) {
      formattedItems[id] = {
        ...formattedItems[id],
        name,
      };
    }
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
if (unhandledSubcategories.size > 0) {
  console.warn(
    `Unhandled subcategories: ${[...unhandledSubcategories.values()].join(", ")}`
  );
}
if (unhandledCategories.size > 0) {
  console.warn(
    `Unhandled categories: ${[...unhandledCategories.values()].join(", ")}`
  );
}
if (unhandledWeapons.size > 0) {
  console.warn(
    `Unhandled weapons: ${[...unhandledWeapons.values()].join(", ")}`
  );
}
const publicPath = p.join(process.cwd(), "public", "formattedItems.json");
f.writeFileSync(publicPath, JSON.stringify(formattedItems, null, 2));
console.log(
  `Formatted items saved to public/formattedItems.json with ${Object.keys(formattedItems).length} items`
);
