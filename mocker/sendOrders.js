const fs = require("fs");
const path = require("path");

const { parseFlags } = require("./cli");
const {
  DEFAULT_APP_URL,
  getEnvironment,
  resolveIngestionSettings,
} = require("./env");

const DEFAULTS = {
  file: path.join(__dirname, "data", "marketorders.raw.jsonl"),
  appUrl: DEFAULT_APP_URL,
};

const VALUE_FLAGS = ["--file", "--token", "--app-url"];
const BOOLEAN_FLAGS = ["--help"];

function parseArgs(args, environment = getEnvironment()) {
  const options = { ...DEFAULTS, ...resolveIngestionSettings(environment) };
  const { values, flags } = parseFlags(args, {
    valueFlags: VALUE_FLAGS,
    booleanFlags: BOOLEAN_FLAGS,
  });

  if (flags.has("--help")) {
    return { ...options, help: true };
  }
  if (values.has("--file")) {
    options.file = path.resolve(values.get("--file"));
  }
  if (values.has("--token")) {
    options.token = values.get("--token");
  }
  if (values.has("--app-url")) {
    options.appUrl = values.get("--app-url");
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

Exits with a non-zero status when any batch fails.
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

async function main(overrides = {}) {
  const options = {
    file: DEFAULTS.file,
    ...resolveIngestionSettings(),
    ...overrides,
  };
  const { file, token, appUrl } = options;

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
  (async () => {
    try {
      const options = parseArgs(process.argv.slice(2));
      if (options.help) {
        printHelp();
        return;
      }
      const { failed } = await main(options);
      if (failed > 0) {
        process.exitCode = 1;
      }
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  })();
}

module.exports = { DEFAULTS, main, parseArgs };
