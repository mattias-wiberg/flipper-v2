const fs = require("fs");
const path = require("path");

const DEFAULTS = {
  file: path.join(__dirname, "data", "marketorders.raw.jsonl"),
  appUrl: "http://localhost:3000",
};

function loadEnvFile(file) {
  if (!fs.existsSync(file)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .flatMap((line) => {
        const match = line.match(
          /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/i,
        );
        if (!match) {
          return [];
        }

        return [[match[1], match[2].replace(/^(['"])(.*)\1$/, "$2")]];
      }),
  );
}

function getEnvironment() {
  return {
    ...loadEnvFile(path.join(process.cwd(), ".env")),
    ...loadEnvFile(path.join(process.cwd(), ".env.local")),
    ...process.env,
  };
}

function parseArgs(args) {
  const environment = getEnvironment();
  const options = {
    ...DEFAULTS,
    token: environment.FLIPPER_INGESTION_TOKEN,
    appUrl: environment.FLIPPER_APP_URL || DEFAULTS.appUrl,
  };

  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    const [flag, inlineValue] = argument.split("=", 2);

    if (flag === "--help") {
      options.help = true;
      continue;
    }

    const value = inlineValue ?? args[++index];
    if (!value) {
      throw new Error(`Missing value for ${flag}`);
    }

    switch (flag) {
      case "--file":
        options.file = path.resolve(value);
        break;
      case "--token":
        options.token = value;
        break;
      case "--app-url":
        options.appUrl = value;
        break;
      default:
        throw new Error(`Unknown option: ${flag}`);
    }
  }

  return options;
}

function printHelp() {
  process.stdout.write(`Usage: node mocker/sendOrders.js [options]

Options:
  --app-url <url>             Flipper base URL (defaults to FLIPPER_APP_URL,
                              then http://localhost:3000)
  --token <uuid>              Ingestion token (defaults to FLIPPER_INGESTION_TOKEN)
  --file <file>               Raw capture to replay (default: ${
    path.relative(process.cwd(), DEFAULTS.file) || DEFAULTS.file
  })
  --help                      Show this help
`);
}

function loadBatches(file) {
  const raw = fs.readFileSync(file, "utf-8");
  if (file.endsWith(".jsonl")) {
    return raw
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line).body);
  }
  return JSON.parse(raw);
}

async function main({
  file = DEFAULTS.file,
  token = getEnvironment().FLIPPER_INGESTION_TOKEN,
  appUrl = getEnvironment().FLIPPER_APP_URL || DEFAULTS.appUrl,
} = {}) {
  if (!token) {
    throw new Error(
      "Missing ingestion token. Set FLIPPER_INGESTION_TOKEN or pass token explicitly.",
    );
  }

  const batches = loadBatches(file);

  let sent = 0;
  let failed = 0;
  let firstError = null;
  const total = batches.length;
  process.stdout.write(`Sending orders: 0/${total} sent, 0 failed\r`);
  for (const orderBatch of batches) {
    try {
      const response = await fetch(
        `${appUrl}/api/${token}/marketorders.ingest`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderBatch),
        },
      );
      if (!response.ok) {
        failed++;
        if (!firstError)
          firstError = `batch ${sent + failed}: ${response.status} ${(
            await response.text()
          ).slice(0, 300)}`;
      } else {
        sent++;
      }
    } catch (err) {
      failed++;
      if (!firstError) firstError = `batch ${sent + failed}: ${err.message}`;
    }
    process.stdout.write(
      `Sending orders: ${sent + failed}/${total} sent, ${failed} failed\r`,
    );
    // break; // Remove this line to send all batches
  }
  process.stdout.write(`\nDone. ${sent} sent, ${failed} failed.\n`);
  if (firstError) process.stdout.write(`First failure: ${firstError}\n`);
  return { sent, failed };
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
    } else {
      main(options).catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
      });
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { main, DEFAULTS, loadBatches, parseArgs };
