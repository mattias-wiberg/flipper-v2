import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const POLICY_PATH = path.resolve(process.cwd(), "site-url-policy.js");

function loadPolicyWithConfiguredOrigin(configuredOrigin: string) {
  const directory = mkdtempSync(path.join(tmpdir(), "site-url-policy-"));
  copyFileSync(POLICY_PATH, path.join(directory, "site-url-policy.js"));
  writeFileSync(
    path.join(directory, "site-url.config.json"),
    JSON.stringify({ canonicalSiteUrl: configuredOrigin }),
    "utf8",
  );

  try {
    return spawnSync(
      process.execPath,
      [
        "-e",
        `require(${JSON.stringify(path.join(directory, "site-url-policy.js"))})`,
      ],
      { encoding: "utf8" },
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("site URL policy configuration", () => {
  it("rejects an invalid configured origin at load time, naming the key only", () => {
    const badOrigins = [
      "https://site-user:site-secret@not-an-origin.example",
      "https://not-an-origin.example/some/path",
    ];

    for (const badOrigin of badOrigins) {
      const result = loadPolicyWithConfiguredOrigin(badOrigin);
      const stderr = String(result.stderr);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(stderr).toContain("canonicalSiteUrl");
      expect(stderr).toContain("site-url.config.json");
      expect(stderr).not.toContain(badOrigin);
      expect(stderr).not.toContain("site-secret");
    }
  });

  it("loads a valid configured origin", () => {
    const result = loadPolicyWithConfiguredOrigin(
      "https://beta.flipper.mattiaswiberg.com",
    );

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
  });
});
