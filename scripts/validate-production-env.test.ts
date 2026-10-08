import { spawnSync } from "node:child_process";
import path from "node:path";

import { CANONICAL_SITE_URL } from "../site-url-policy.js";

function runValidation(
  environment: Record<string, string | undefined>,
  options: { buildOnly?: boolean } = {},
) {
  // Scrub inherited public and server-secret names so ambient NEXT_PUBLIC_*
  // exports cannot trip the script's forbidden-name scan or required checks.
  // Start from process.env (which carries the required NODE_ENV) and delete
  // the scrubbed names instead of rebuilding a literal.
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NEXT_PUBLIC_SITE_URL: environment.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: environment.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: environment.SUPABASE_SERVICE_ROLE_KEY,
  };
  for (const name of Object.keys(env)) {
    if (
      name === "SUPABASE_SERVICE_ROLE_KEY" &&
      environment.SUPABASE_SERVICE_ROLE_KEY === undefined
    ) {
      delete env[name];
    } else if (
      name.startsWith("NEXT_PUBLIC_") &&
      ![
        "NEXT_PUBLIC_SITE_URL",
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ].includes(name)
    ) {
      delete env[name];
    }
  }

  const args = [
    path.resolve(process.cwd(), "scripts/validate-production-env.mjs"),
  ];
  if (options.buildOnly !== false) {
    args.push("--build");
  }

  return spawnSync(process.execPath, args, {
    env,
    encoding: "utf8",
  });
}

describe("production environment validation", () => {
  it("accepts the configured public origin", () => {
    const result = runValidation({
      NEXT_PUBLIC_SITE_URL: CANONICAL_SITE_URL,
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(String(result.stderr)).toBe("");
  });

  it("rejects a site URL that is not the configured origin by name only", () => {
    const wrongValue = "https://flipper.mattiaswiberg.com";
    const result = runValidation({
      NEXT_PUBLIC_SITE_URL: wrongValue,
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
    });
    const stderr = String(result.stderr);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(stderr).toContain("NEXT_PUBLIC_SITE_URL");
    expect(stderr).not.toContain(wrongValue);
  });

  it("reports credential-bearing URLs by variable name only", () => {
    const siteSecret = "site-secret-for-test";
    const supabaseSecret = "supabase-secret-for-test";
    const result = runValidation({
      NEXT_PUBLIC_SITE_URL: `https://site-user:${siteSecret}@flipper.mattiaswiberg.com/`,
      NEXT_PUBLIC_SUPABASE_URL: `https://supabase-user:${supabaseSecret}@project.supabase.co/`,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
    });
    const stderr = String(result.stderr);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(stderr).toContain("NEXT_PUBLIC_SITE_URL");
    expect(stderr).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(stderr).not.toContain(siteSecret);
    expect(stderr).not.toContain(supabaseSecret);
  });

  it("requires the runtime service-role key at production startup, by name only", () => {
    const environment = {
      NEXT_PUBLIC_SITE_URL: CANONICAL_SITE_URL,
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
    };
    const missingSecret = runValidation(environment, { buildOnly: false });
    const missingStderr = String(missingSecret.stderr);

    expect(missingSecret.error).toBeUndefined();
    expect(missingSecret.status).toBe(1);
    expect(missingStderr).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(missingStderr).not.toContain("service-role");

    const withSecret = runValidation(
      {
        ...environment,
        SUPABASE_SERVICE_ROLE_KEY: "server-only-service-role-key",
      },
      { buildOnly: false },
    );

    expect(withSecret.error).toBeUndefined();
    expect(withSecret.status).toBe(0);
    expect(String(withSecret.stderr)).toBe("");
  });
});
