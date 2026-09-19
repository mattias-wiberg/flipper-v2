import { promises as fs } from "fs";
import path from "path";

// Local-dev recorder for live scans (see mocker/README.md "Live scan").
//
// Appends every posted body as one JSON line:
//   {"receivedAt": "<iso>", "body": <exact posted JSON>}
// so a scan can later be replayed byte-for-byte through the real ingest
// route (`npm run golden:replay`).
//
// Deliberately append-only (safe under rapid page-through traffic, unlike
// read-modify-write) and deliberately unvalidated — replay must reproduce
// exactly what live traffic did, including rejected batches.
const RAW_FILE = path.join(
  process.cwd(),
  "mocker",
  "data",
  "golden.raw.jsonl"
);

export async function POST(request: Request) {
  try {
    const text = await request.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { _unparseable: text?.slice(0, 1000) };
    }
    const line =
      JSON.stringify({ receivedAt: new Date().toISOString(), body }) + "\n";
    await fs.appendFile(RAW_FILE, line, "utf-8");
    return new Response("Recorded", { status: 200 });
  } catch (error) {
    console.error("Error recording request:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
