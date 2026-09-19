import fs from "fs";
import path from "path";

let cachedWorldNames: Record<string, string> | undefined;

function normalizeWorldId(id: string): string {
  return /^\d+$/.test(id) ? id.replace(/^0+(?=\d)/, "") : id;
}

function getWorldNames(): Record<string, string> {
  if (!cachedWorldNames) {
    const worldNamesPath = path.join(
      process.cwd(),
      "public",
      "formattedWorldNames.json"
    );
    const raw = fs.readFileSync(worldNamesPath, "utf-8");
    const worldNames = JSON.parse(raw) as Record<string, string>;
    cachedWorldNames = Object.fromEntries(
      Object.entries(worldNames).map(([id, name]) => [
        normalizeWorldId(id),
        name,
      ])
    );
  }
  // At this point, cachedWorldNames is guaranteed to be initialized
  return cachedWorldNames as Record<string, string>;
}

/**
 * Returns the world name string for a given world ID.
 * @param id The world ID
 * @returns The world name string, or "?" if not found
 */
export function getWorldName(id: number | string): string {
  const worldNames = getWorldNames();
  return worldNames[normalizeWorldId(id.toString())] ?? "?";
}
