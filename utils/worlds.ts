import fs from "fs";
import path from "path";

let cachedWorldNames: Record<string, string> | undefined;

function getWorldNames(): Record<string, string> {
  if (!cachedWorldNames) {
    const worldNamesPath = path.join(
      process.cwd(),
      "public",
      "formattedWorldNames.json"
    );
    const raw = fs.readFileSync(worldNamesPath, "utf-8");
    cachedWorldNames = JSON.parse(raw);
  }
  // At this point, cachedWorldNames is guaranteed to be initialized
  return cachedWorldNames as Record<string, string>;
}

/**
 * Returns the world name string for a given world ID.
 * @param id The world ID
 * @returns The world name string, or undefined if not found
 */
export function getWorldName(id: number): string {
  const worldNames = getWorldNames();
  return worldNames[id.toString()] ?? "?";
}
