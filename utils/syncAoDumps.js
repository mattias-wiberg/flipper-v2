const fs = require("fs/promises");
const path = require("path");

const rawDumpsUrl =
  "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master";
const formattedDumpsUrl = `${rawDumpsUrl}/formatted`;

const sources = [
  // formatted/items.json contains localization only; the formatter also needs
  // shop slots and crafting requirements from the raw item dump.
  {
    url: `${rawDumpsUrl}/items.json`,
    destination: path.join(__dirname, "items.json"),
    validate(text) {
      const data = JSON.parse(text);
      if (!data || Array.isArray(data) || !data.items) {
        throw new Error(
          "The downloaded item dump does not contain item metadata",
        );
      }
    },
  },
  {
    url: `${formattedDumpsUrl}/items.txt`,
    destination: path.join(__dirname, "items.txt"),
    validate(text) {
      if (!text.includes(":")) {
        throw new Error("The downloaded item names dump is empty or invalid");
      }
    },
  },
  {
    url: `${formattedDumpsUrl}/world.txt`,
    destination: path.join(__dirname, "world.txt"),
    validate(text) {
      if (!text.includes(":")) {
        throw new Error("The downloaded world names dump is empty or invalid");
      }
    },
  },
];

async function download(source) {
  const response = await fetch(source.url);
  if (!response.ok) {
    throw new Error(`${source.url} returned HTTP ${response.status}`);
  }

  const text = await response.text();
  source.validate(text);
  return text;
}

async function replaceFile(destination, contents) {
  const temporaryPath = `${destination}.${process.pid}.tmp`;
  await fs.writeFile(temporaryPath, contents, "utf8");
  await fs.rm(destination, { force: true });
  await fs.rename(temporaryPath, destination);
}

async function main() {
  for (const source of sources) {
    const contents = await download(source);
    await replaceFile(source.destination, contents);
    console.log(`Synced ${path.relative(process.cwd(), source.destination)}`);
  }
}

main().catch((error) => {
  console.error(`Failed to sync Albion Online dumps: ${error.message}`);
  process.exitCode = 1;
});
