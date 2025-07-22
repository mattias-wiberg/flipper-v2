import { findItemCategory } from "./items";

describe("findItemCategory", () => {
  it("should return the correct category for UNIQUE_HIDEOUT", () => {
    expect(findItemCategory("UNIQUE_HIDEOUT")).toBe("other");
  });

  it("should return null for a non-existent item", () => {
    expect(findItemCategory("NON_EXISTENT_ITEM")).toBeNull();
  });
});
