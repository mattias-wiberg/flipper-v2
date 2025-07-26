import { getItemCategory } from "./items";

describe("findItemCategory", () => {
  it("should return the correct category for UNIQUE_HIDEOUT", () => {
    expect(getItemCategory("UNIQUE_HIDEOUT")).toBe("other");
  });

  it("should return null for a non-existent item", () => {
    expect(getItemCategory("NON_EXISTENT_ITEM")).toBeNull();
  });
});
