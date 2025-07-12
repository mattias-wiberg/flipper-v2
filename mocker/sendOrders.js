const fs = require("fs");
const path = require("path");

const ordersPath = path.join(__dirname, "data", "orders.json");

async function main() {
  const fileContent = fs.readFileSync(ordersPath, "utf-8");
  const orderBatches = JSON.parse(fileContent);

  const token = "686a3f00-a8e4-40f5-88b8-4525c2f0bca8"; // Replace with your actual token
  let sent = 0;
  let failed = 0;
  const total = orderBatches.length;
  process.stdout.write(`Sending orders: 0/${total} sent, 0 failed\r`);
  for (const [i, orderBatch] of orderBatches.entries()) {
    try {
      const response = await fetch(
        `http://localhost:3000/api/${token}/marketorders.ingest`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderBatch),
        }
      );
      if (!response.ok) {
        failed++;
      } else {
        sent++;
      }
    } catch (err) {
      failed++;
    }
    process.stdout.write(
      `Sending orders: ${sent + failed}/${total} sent, ${failed} failed\r`
    );
  }
  process.stdout.write(`\nDone. ${sent} sent, ${failed} failed.\n`);
}

main();
