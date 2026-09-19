const fs = require("fs");
const path = require("path");

const DEFAULTS = {
  file: path.join(__dirname, "data", "marketorders.raw.jsonl"),
  token: "14f799f4-bdf0-4feb-856a-30641cdd7250",
  appUrl: "http://localhost:3000",
};

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
  token = DEFAULTS.token,
  appUrl = DEFAULTS.appUrl,
} = {}) {
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
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { main, DEFAULTS };
