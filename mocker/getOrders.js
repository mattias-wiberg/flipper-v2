const fs = require("fs");
const crypto = require("crypto");
const os = require("os");
const path = require("path");

const { parseFlags } = require("./cli");
const { getEnvironment, resolveIngestionSettings } = require("./env");

const EXPECTED_OUTPUT = path.resolve(
  path.join(__dirname, "data", "marketorders.expected.json"),
);

const DEFAULTS = {
  output: path.join(
    os.tmpdir(),
    `flipper-v2-marketorders-${process.pid}.actual.json`,
  ),
  pageSize: 1000,
  includeCreatedAt: false,
  compare: false,
};

const ORDER_COLUMNS = [
  "id",
  "item_type_id",
  "item_group_type_id",
  "location_id",
  "tier",
  "quality_level",
  "enchantment_level",
  "unit_price_silver",
  "amount",
  "action_type",
  "expires",
];

const VALUE_FLAGS = ["--url", "--key", "--token", "--output", "--page-size"];
const BOOLEAN_FLAGS = ["--include-created-at", "--compare", "--help"];

function parseArgs(args, environment = getEnvironment()) {
  const options = {
    ...DEFAULTS,
    token: resolveIngestionSettings(environment).token,
    url: environment.NEXT_PUBLIC_SUPABASE_URL,
    key: environment.SUPABASE_SERVICE_ROLE_KEY,
  };

  const { values, flags } = parseFlags(args, {
    valueFlags: VALUE_FLAGS,
    booleanFlags: BOOLEAN_FLAGS,
  });

  options.includeCreatedAt = flags.has("--include-created-at");
  options.compare = flags.has("--compare");
  options.help = flags.has("--help");
  if (values.has("--url")) {
    options.url = values.get("--url");
  }
  if (values.has("--key")) {
    options.key = values.get("--key");
  }
  if (values.has("--token")) {
    options.token = values.get("--token");
  }
  if (values.has("--output")) {
    options.output = path.resolve(values.get("--output"));
  }
  if (values.has("--page-size")) {
    options.pageSize = Number(values.get("--page-size"));
  }

  return options;
}

function printHelp() {
  process.stdout.write(`Usage: node mocker/getOrders.js [options]

Options:
  --url <url>                 Supabase URL (defaults to NEXT_PUBLIC_SUPABASE_URL)
  --key <key>                 Service role key (defaults to SUPABASE_SERVICE_ROLE_KEY)
  --token <uuid>              Token to export (defaults to FLIPPER_INGESTION_TOKEN)
  --output <file>             Output JSON path
  --page-size <number>        Rows per request (default: ${DEFAULTS.pageSize})
  --include-created-at        Include database-generated created_at values
  --compare                   Compare output with the checked-in expected fixture
  --help                      Show this help
`);
}

function realPath(file) {
  const resolved = path.resolve(file);
  try {
    return fs.realpathSync.native(resolved);
  } catch {
    // The target does not exist yet: resolve its parent so symlinked
    // directories and case-variant names compare equal.
    const parent = path.dirname(resolved);
    if (parent === resolved) {
      return resolved;
    }
    return path.join(realPath(parent), path.basename(resolved));
  }
}

const CASE_INSENSITIVE_FILESYSTEM =
  process.platform === "win32" || process.platform === "darwin";

function comparablePath(file) {
  const resolved = realPath(file);
  return CASE_INSENSITIVE_FILESYSTEM ? resolved.toLowerCase() : resolved;
}

function isSameFile(file, otherFile) {
  try {
    const fileStat = fs.statSync(file, { bigint: true });
    const otherStat = fs.statSync(otherFile, { bigint: true });
    return (
      fileStat.ino !== 0n &&
      fileStat.dev === otherStat.dev &&
      fileStat.ino === otherStat.ino
    );
  } catch {
    return false;
  }
}

function assertSafeOutput(output) {
  if (
    comparablePath(output) === comparablePath(EXPECTED_OUTPUT) ||
    isSameFile(output, EXPECTED_OUTPUT)
  ) {
    throw new Error(
      "Refusing to overwrite the checked-in expected fixture. Use a temporary output path.",
    );
  }
}

function hashFile(file) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");
}

function compareWithExpected(output) {
  const expectedHash = hashFile(EXPECTED_OUTPUT);
  const actualHash = hashFile(output);

  process.stdout.write(`expected sha256: ${expectedHash}\n`);
  process.stdout.write(`actual sha256:   ${actualHash}\n`);
  if (expectedHash !== actualHash) {
    throw new Error("Golden test failed");
  }
  process.stdout.write("Golden test passed\n");
}

async function getOrders({
  url,
  key,
  token,
  pageSize = DEFAULTS.pageSize,
  includeCreatedAt = DEFAULTS.includeCreatedAt,
}) {
  if (!url) {
    throw new Error(
      "Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL or --url.",
    );
  }
  if (!key) {
    throw new Error(
      "Missing Supabase service role key. Set SUPABASE_SERVICE_ROLE_KEY or --key.",
    );
  }
  if (!token) {
    throw new Error(
      "Missing ingestion token. Set FLIPPER_INGESTION_TOKEN or --token.",
    );
  }
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error("--page-size must be a positive integer");
  }

  const columns = includeCreatedAt
    ? [...ORDER_COLUMNS, "created_at"]
    : ORDER_COLUMNS;
  const orders = [];
  const baseUrl = url.replace(/\/+$/, "");

  for (let offset = 0; ; offset += pageSize) {
    const query = new URLSearchParams({
      select: columns.join(","),
      token: `eq.${token}`,
      order: "id.asc",
      limit: String(pageSize),
      offset: String(offset),
    });
    const response = await fetch(`${baseUrl}/rest/v1/orders?${query}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    if (!response.ok) {
      const details = (await response.text()).slice(0, 300);
      throw new Error(
        `Supabase orders query failed (${response.status}): ${details}`,
      );
    }

    const batch = await response.json();
    if (!Array.isArray(batch)) {
      throw new Error("Supabase orders query returned a non-array response");
    }
    orders.push(...batch);

    if (batch.length < pageSize) {
      return orders;
    }
  }
}

async function main(overrides = {}) {
  const environment = getEnvironment();
  const options = {
    ...DEFAULTS,
    url: environment.NEXT_PUBLIC_SUPABASE_URL,
    key: environment.SUPABASE_SERVICE_ROLE_KEY,
    token: resolveIngestionSettings(environment).token,
    ...overrides,
  };
  const output = path.resolve(options.output);
  assertSafeOutput(output);
  const orders = await getOrders(options);

  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(orders)}\n`, "utf8");
  process.stdout.write(`Saved ${orders.length} orders to ${output}\n`);

  if (options.compare) {
    compareWithExpected(output);
  }

  return { count: orders.length, output };
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

module.exports = { DEFAULTS, assertSafeOutput, getOrders, main, parseArgs };
