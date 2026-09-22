import { spawn } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";

function runVerifier(baseUrl: string) {
  const child = spawn(
    process.execPath,
    [path.resolve(process.cwd(), "scripts/verify-deployment.mjs")],
    {
      env: { ...process.env, DEPLOYMENT_BASE_URL: baseUrl },
      stdio: ["ignore", "ignore", "pipe"],
    },
  );
  let stderr = "";
  child.stderr?.setEncoding("utf8");
  child.stderr?.on("data", (chunk: string) => {
    stderr += chunk;
  });

  return new Promise<{ code: number | null; stderr: string }>(
    (resolve, reject) => {
      child.once("error", reject);
      child.once("close", (code) => resolve({ code, stderr }));
    },
  );
}

describe("deployment verifier", () => {
  it("rejects redirects instead of validating a followed response", async () => {
    const server = createServer((_request, response) => {
      response.writeHead(302, {
        Location: "https://flipper.mattiaswiberg.com/",
      });
      response.end();
    });

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });

    try {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("test server did not expose a port");
      }

      const result = await runVerifier(`http://127.0.0.1:${address.port}`);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain("health returned HTTP 302, expected 200");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
