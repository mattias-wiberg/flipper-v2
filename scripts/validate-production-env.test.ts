import { spawnSync } from "node:child_process";
import path from "node:path";

describe("production environment validation", () => {
  it("reports credential-bearing URLs by variable name only", () => {
    const siteSecret = "site-secret-for-test";
    const supabaseSecret = "supabase-secret-for-test";
    const result = spawnSync(
      process.execPath,
      [
        path.resolve(process.cwd(), "scripts/validate-production-env.mjs"),
        "--build",
      ],
      {
        env: {
          ...process.env,
          NEXT_PUBLIC_SITE_URL: `https://site-user:${siteSecret}@flipper.mattiaswiberg.com/`,
          NEXT_PUBLIC_SUPABASE_URL: `https://supabase-user:${supabaseSecret}@project.supabase.co/`,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
        },
        encoding: "utf8",
      },
    );
    const stderr = String(result.stderr);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(stderr).toContain("NEXT_PUBLIC_SITE_URL");
    expect(stderr).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(stderr).not.toContain(siteSecret);
    expect(stderr).not.toContain(supabaseSecret);
  });
});
