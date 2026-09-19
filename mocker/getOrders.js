const fs = require("fs");
const path = require("path");

const DEFAULTS = {
  token: "14f799f4-bdf0-4feb-856a-30641cdd7250",
  output: path.join(__dirname, "data", "marketorders.expected.json"),
  pageSize: 1000,
  includeCreatedAt: false,
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
    url: environment.NEXT_PUBLIC_SUPABASE_URL,
    key: environment.SUPABASE_SERVICE_ROLE_KEY,
  };

  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    const [flag, inlineValue] = argument.split("=", 2);

    if (flag === "--include-created-at") {
      options.includeCreatedAt = true;
      continue;
    }
    if (flag === "--help") {
      options.help = true;
      continue;
    }

    const value = inlineValue ?? args[++index];
    if (!value) {
      throw new Error(`Missing value for ${flag}`);
    }

    switch (flag) {
      case "--url":
        options.url = value;
        break;
      case "--key":
        options.key = value;
        break;
      case "--token":
        options.token = value;
        break;
      case "--output":
        options.output = path.resolve(value);
        break;
      case "--page-size":
        options.pageSize = Number(value);
        break;
      default:
        throw new Error(`Unknown option: ${flag}`);
    }
  }

  return options;
}

function printHelp() {
  process.stdout.write(`Usage: node mocker/getOrders.js [options]

Options:
  --url <url>                 Supabase URL (defaults to NEXT_PUBLIC_SUPABASE_URL)
  --key <key>                 Service role key (defaults to SUPABASE_SERVICE_ROLE_KEY)
  --token <uuid>              Token to export
  --output <file>             Output JSON path
  --page-size <number>        Rows per request (default: ${DEFAULTS.pageSize})
  --include-created-at        Include database-generated created_at values
  --help                      Show this help
`);
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
    ...overrides,
  };
  const orders = await getOrders(options);

  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, `${JSON.stringify(orders)}\n`, "utf8");
  process.stdout.write(`Saved ${orders.length} orders to ${options.output}\n`);

  return { count: orders.length, output: options.output };
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

module.exports = { DEFAULTS, getOrders, main, parseArgs };
