const fs = require("fs");
const path = require("path");

const worldNamesPath = path.join(__dirname, "world.txt");
const outputPath = path.resolve(
  __dirname,
  "..",
  "public",
  "formattedWorldNames.json",
);

function parseWorldNames(raw) {
  const worldNames = {};

  for (const line of raw.split(/\r?\n/)) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const id = line.slice(0, separatorIndex).trim();
    const name = line.slice(separatorIndex + 1).trim();
    if (id && name) {
      worldNames[id] = name;
    }
  }

  return worldNames;
}

const formattedWorldNames = parseWorldNames(
  fs.readFileSync(worldNamesPath, "utf8"),
);
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(formattedWorldNames, null, 2)}\n`,
);
console.log(
  `Formatted world names saved to ${path.relative(process.cwd(), outputPath)} with ${Object.keys(formattedWorldNames).length} items`,
);
