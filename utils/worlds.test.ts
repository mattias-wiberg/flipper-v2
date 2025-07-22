import { getWorldName } from "./worlds";

describe("getWorldName", () => {
  it("returns the correct world name for a valid ID", () => {
    // Use a known ID from formattedWorldNames.json
    expect(getWorldName("1000")).toBe("Lymhurst");
  });

  it("returns undefined for an invalid ID", () => {
    expect(getWorldName("999999")).toBeUndefined();
  });
});
