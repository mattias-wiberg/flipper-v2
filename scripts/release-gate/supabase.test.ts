import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import { countOrders } from "./supabase.js";

async function withServer(
  status: number,
  headers: Record<string, string>,
  run: (url: string) => Promise<void>,
) {
  const server = createServer((_request, response) => {
    response.writeHead(status, headers);
    response.end("[]");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

function gateConfig(url: string) {
  return { supabase: { url, serviceRoleKey: "service-role-value" } };
}

describe("Supabase order count", () => {
  it("reads the total when PostgREST answers 206 Partial Content", async () => {
    await withServer(206, { "content-range": "0-0/42" }, async (url) => {
      await expect(countOrders(gateConfig(url))).resolves.toBe(42);
    });
  });

  it("still rejects a failed count request", async () => {
    await withServer(400, {}, async (url) => {
      await expect(countOrders(gateConfig(url))).rejects.toThrow(
        "Supabase orders count returned HTTP 400, expected 200 or 206",
      );
    });
  });
});
