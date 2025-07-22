const f = require("fs");
const p = require("path");

const worldNamesJsonPath = p.resolve(__dirname, "world.txt");
const worldNamesRaw = f.readFileSync(worldNamesJsonPath, "utf-8");
const worldNames = worldNamesRaw.split("\n");

const formattedWorldNames = {};
for (const worldNameLine of worldNames) {
  // Match any line with format: ID: Name (ID can be any non-space string)
  const match = worldNameLine.match(/^([^:]+):\s*(.+)$/);
  if (match) {
    const id = match[1].trim();
    const name = match[2].trim();
    formattedWorldNames[id] = name;
  }
}
const publicPath = p.join(process.cwd(), "public", "formattedWorldNames.json");
f.writeFileSync(publicPath, JSON.stringify(formattedWorldNames, null, 2));
console.log(
  `Formatted world names saved to formattedWorldNames.json with ${Object.keys(formattedWorldNames).length} items`
);
