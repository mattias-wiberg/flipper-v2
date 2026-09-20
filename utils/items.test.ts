import { getItemCategory, getItemName, getItemValue } from "./items";

describe("item formatting data", () => {
  it("returns the persisted category, name, and value for a known item", () => {
    expect(getItemCategory("T6_MAIN_SWORD")).toBe("1H-weapon");
    expect(getItemName("T6_MAIN_SWORD")).toBe("Master's Broadsword");
    expect(getItemValue("T6_MAIN_SWORD")).toBe(1536);
  });

  it("throws for an item that is not present in the formatted data", () => {
    expect(() => getItemCategory("NON_EXISTENT_ITEM")).toThrow(
      "Item type ID NON_EXISTENT_ITEM not found in formattedItems.json",
    );
  });
});
