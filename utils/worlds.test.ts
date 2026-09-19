import { getWorldName } from "./worlds";

describe("getWorldName", () => {
  it("returns the correct world name for a valid ID", () => {
    // Use a known ID from formattedWorldNames.json
    expect(getWorldName("1000")).toBe("Lymhurst");
  });

  it("resolves IDs that were zero-padded in the world dump", () => {
    expect(getWorldName(7)).toBe("Thetford Market");
    expect(getWorldName("0007")).toBe("Thetford Market");
    expect(getWorldName(201)).toBe("Sleetwater Basin");
  });

  it("returns a placeholder for an invalid ID", () => {
    expect(getWorldName("999999")).toBe("?");
  });
});
