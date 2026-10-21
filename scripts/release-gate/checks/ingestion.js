// Market-order ingestion boundary and the deployed golden replay.
//
// Direct HTTP against the deployed route, then the unchanged checked-in
// fixture comparison through the parameterized mocker tooling from #59. The
// expected fixture is hashed before and after and never regenerated.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { assertBody, assertStatus, httpFetch, textOf } = require("../http.js");
const { REPO_ROOT, runNode } = require("../process.js");
const {
  deleteOrdersForToken,
  listOrderIdsForToken,
} = require("../supabase.js");
const { skip } = require("../skip.js");

const RAW_FIXTURE = path.join(
  REPO_ROOT,
  "mocker",
  "data",
  "marketorders.raw.jsonl",
);
const EXPECTED_FIXTURE = path.join(
  REPO_ROOT,
  "mocker",
  "data",
  "marketorders.expected.json",
);
const SKIP_NOTE =
  "RELEASE_BASE_URL is not set, so the deployed service was not contacted";

function ingestionUrl(config, token) {
  return new URL(
    `/api/${encodeURIComponent(token)}/marketorders.ingest`,
    config.baseUrl,
  );
}

function post(config, token, body) {
  return httpFetch(ingestionUrl(config, token), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function sha256(file) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");
}

function sampleOrders() {
  const base = Math.floor(Date.now() / 1000) % 1_000_000_000;
  const common = {
    ItemGroupTypeId: "T4_BAG",
    LocationId: "3005",
    QualityLevel: 1,
    EnchantmentLevel: 0,
    Expires: "2026-12-01T00:00:00",
  };
  return {
    valid: [
      {
        ...common,
        Id: base,
        ItemTypeId: "T4_BAG",
        UnitPriceSilver: 12_340_000,
        Amount: 3,
        AuctionType: "offer",
      },
      {
        ...common,
        Id: base + 1,
        ItemTypeId: "T5_BAG",
        UnitPriceSilver: 20_000_000,
        Amount: 5,
        AuctionType: "request",
      },
    ],
    unusable: {
      ...common,
      Id: base + 2,
      ItemTypeId: "NO_TIER_MARKER",
      UnitPriceSilver: 10_000,
      Amount: 1,
      AuctionType: "offer",
    },
  };
}

const invalidToken = {
  id: "deployed.ingestion-invalid-token",
  phase: "deployed",
  core: true,
  required: (config) => Boolean(config.baseUrl),
  skipNote: SKIP_NOTE,
  async run(config) {
    const response = await post(config, crypto.randomUUID(), {
      Orders: sampleOrders().valid,
    });
    assertStatus(response, 401, "ingestion with an unknown token");
    assertBody(await textOf(response), "Invalid token", "unknown token");
    return "an unknown token is rejected with 401 Invalid token";
  },
};

const malformedJson = {
  id: "deployed.ingestion-malformed-json",
  phase: "deployed",
  core: true,
  required: (config) => Boolean(config.baseUrl && config.ingestion),
  skipNote:
    "RELEASE_BASE_URL and SMOKE_INGESTION_TOKEN are required to reach the route past its token gate",
  async run(config) {
    const response = await post(config, config.ingestion.token, "{");
    assertStatus(response, 400, "ingestion with malformed JSON");
    assertBody(await textOf(response), "Invalid JSON", "malformed JSON");
    return "malformed JSON is rejected with 400 Invalid JSON";
  },
};

const malformedBody = {
  id: "deployed.ingestion-malformed-body",
  phase: "deployed",
  core: true,
  required: (config) => Boolean(config.baseUrl && config.ingestion),
  skipNote:
    "RELEASE_BASE_URL and SMOKE_INGESTION_TOKEN are required to reach the route past its token gate",
  async run(config) {
    const response = await post(config, config.ingestion.token, {
      Orders: [{ Id: "not-a-number" }],
    });
    assertStatus(response, 400, "ingestion with a malformed order body");
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error("malformed order body did not return a JSON diagnostic");
    }
    if (
      payload?.error !== "Invalid body format" ||
      !Array.isArray(payload?.details)
    ) {
      throw new Error(
        "malformed order body did not return the Invalid body format contract",
      );
    }
    return "a malformed order body is rejected with 400 Invalid body format and issue details";
  },
};

const unusableItem = {
  id: "deployed.ingestion-unusable-item",
  phase: "deployed",
  core: true,
  required: (config) =>
    Boolean(config.baseUrl && config.ingestion && config.supabase),
  skipNote:
    "RELEASE_BASE_URL, SMOKE_INGESTION_TOKEN, and Supabase credentials are required to prove what a valid batch persists",
  async run(config) {
    const token = config.ingestion.token;
    const orders = sampleOrders();

    await deleteOrdersForToken(config, token);
    const response = await post(config, token, {
      Orders: [...orders.valid, orders.unusable],
    });
    assertStatus(response, 200, "valid batch with an unusable item identifier");
    assertBody(await textOf(response), "Ingestion successful", "valid batch");

    const persisted = await listOrderIdsForToken(config, token);
    const expected = orders.valid.map((order) => order.Id);
    if (
      persisted.length !== expected.length ||
      !expected.every((id) => persisted.includes(id))
    ) {
      throw new Error(
        "the batch with an unusable item identifier did not persist exactly the valid orders",
      );
    }

    return "a valid batch persists its orders and warns past the unusable item identifier (2 of 3 orders persisted)";
  },
};

function readHead(file, bytes = 200) {
  const descriptor = fs.openSync(file, "r");
  try {
    const buffer = Buffer.alloc(bytes);
    const read = fs.readSync(descriptor, buffer, 0, bytes, 0);
    return buffer.subarray(0, read).toString("utf8");
  } finally {
    fs.closeSync(descriptor);
  }
}

function isLfsPointer(file) {
  return readHead(file).startsWith(
    "version https://git-lfs.github.com/spec/v1",
  );
}

const goldenReplay = {
  id: "deployed.golden-replay",
  phase: "deployed",
  core: true,
  required: (config) =>
    Boolean(config.baseUrl && config.ingestion && config.supabase),
  skipNote:
    "RELEASE_BASE_URL, SMOKE_INGESTION_TOKEN, and Supabase credentials are required for the deployed golden replay",
  async run(config) {
    if (!fs.existsSync(RAW_FIXTURE) || isLfsPointer(RAW_FIXTURE)) {
      throw skip(
        "the raw capture is not a real Git LFS checkout; run `git lfs pull` to record the deployed golden replay",
      );
    }

    const before = sha256(EXPECTED_FIXTURE);
    const token = config.ingestion.token;

    try {
      await deleteOrdersForToken(config, token);

      const replay = await runNode(["mocker/sendOrders.js"], {
        timeoutMs: 1_800_000,
        env: {
          ...process.env,
          FLIPPER_APP_URL: config.baseUrl,
          FLIPPER_INGESTION_TOKEN: token,
        },
      });
      const replaySummary = replay.stdout.match(
        /Done\. (\d+) sent, (\d+) failed\./,
      );
      if (!replaySummary) {
        throw new Error("the deployed golden replay produced no summary");
      }
      const [, sent, failed] = replaySummary.map(Number);
      if (failed > 0 || sent === 0) {
        throw new Error(
          `the deployed golden replay failed: ${sent} sent, ${failed} failed`,
        );
      }

      const compare = await runNode(["mocker/getOrders.js", "--compare"], {
        timeoutMs: 900_000,
        env: { ...process.env, FLIPPER_INGESTION_TOKEN: token },
      });
      const expected = compare.stdout.match(
        /expected sha256:\s*([0-9a-f]{64})/,
      );
      const actual = compare.stdout.match(/actual sha256:\s*([0-9a-f]{64})/);
      if (
        compare.code !== 0 ||
        !compare.stdout.includes("Golden test passed")
      ) {
        throw new Error(
          "the deployed golden replay did not match the expected fixture" +
            (expected?.[1] && actual?.[1]
              ? ` (expected ${expected[1]}, actual ${actual[1]})`
              : ""),
        );
      }

      if (sha256(EXPECTED_FIXTURE) !== before) {
        throw new Error(
          "the checked-in expected fixture changed during the gate",
        );
      }

      return `${sent} batches replayed with ${failed} failures; the exported rows match the unchanged expected fixture (sha256 ${actual?.[1] ?? expected?.[1] ?? before})`;
    } finally {
      await deleteOrdersForToken(config, token).catch(() => {});
    }
  },
};

module.exports = {
  checks: [
    invalidToken,
    malformedJson,
    malformedBody,
    unusableItem,
    goldenReplay,
  ],
};
