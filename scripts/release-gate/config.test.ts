import { CANONICAL_SITE_URL, parseGateConfig } from "./config.js";

const FULL_ENV = {
  RELEASE_BASE_URL: "https://beta.flipper.mattiaswiberg.com",
  SMOKE_EMAIL: "smoke@example.test",
  SMOKE_PASSWORD: "not-a-real-password",
  SMOKE_INGESTION_TOKEN: "11111111-2222-4333-8444-555555555555",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-value",
  UMAMI_URL: "https://umami.mattiaswiberg.com",
  UMAMI_USERNAME: "operator",
  UMAMI_PASSWORD: "umami-password",
  UMAMI_WEBSITE_ID: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
};

function config(env: Record<string, string | undefined>) {
  return parseGateConfig(env as NodeJS.ProcessEnv);
}

describe("release-gate configuration", () => {
  it("skips every group and reports notes when no release environment is set", () => {
    const parsed = config({});

    expect(parsed.baseUrl).toBeNull();
    expect(parsed.auth).toBeNull();
    expect(parsed.ingestion).toBeNull();
    expect(parsed.supabase).toBeNull();
    expect(parsed.umami).toBeNull();
    expect(parsed.local.enabled).toBe(false);
    expect(parsed.container).toBe(false);
    expect(parsed.errors).toEqual([]);
    expect(parsed.notes.join(" ")).toContain("RELEASE_BASE_URL");
  });

  it("uses the configured canonical origin as the expected origin", () => {
    expect(config({}).expectedSiteUrl).toBe(CANONICAL_SITE_URL);
  });

  it("enables every group with a complete environment and keeps secrets for redaction only", () => {
    const parsed = config(FULL_ENV);

    expect(parsed.errors).toEqual([]);
    expect(parsed.baseUrl).toBe(FULL_ENV.RELEASE_BASE_URL);
    expect(parsed.auth?.email).toBe(FULL_ENV.SMOKE_EMAIL);
    expect(parsed.ingestion?.token).toBe(FULL_ENV.SMOKE_INGESTION_TOKEN);
    expect(parsed.supabase?.url).toBe(FULL_ENV.NEXT_PUBLIC_SUPABASE_URL);
    expect(parsed.umami?.websiteId).toBe(FULL_ENV.UMAMI_WEBSITE_ID);
    expect(parsed.secrets).toEqual(
      expect.arrayContaining([
        FULL_ENV.SMOKE_PASSWORD,
        FULL_ENV.SMOKE_INGESTION_TOKEN,
        FULL_ENV.SUPABASE_SERVICE_ROLE_KEY,
        FULL_ENV.UMAMI_PASSWORD,
      ]),
    );
  });

  it("skips Auth by name when only half of the controlled account is configured", () => {
    const parsed = config({ SMOKE_EMAIL: "smoke@example.test" });

    expect(parsed.auth).toBeNull();
    expect(parsed.notes.join(" ")).toContain("SMOKE_PASSWORD");
    expect(parsed.notes.join(" ")).not.toContain("smoke@example.test");
  });

  it("rejects a base URL with a path by naming the variable only", () => {
    const parsed = config({
      RELEASE_BASE_URL: "https://beta.example.test/app",
    });

    expect(parsed.baseUrl).toBeNull();
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.errors[0]?.variable).toBe("RELEASE_BASE_URL");
    expect(parsed.errors[0]?.message).not.toContain("beta.example.test");
  });

  it("requires https except for a local container", () => {
    expect(
      config({ RELEASE_BASE_URL: "http://beta.example.test" }).errors,
    ).toHaveLength(1);
    expect(
      config({ RELEASE_BASE_URL: "http://127.0.0.1:3000" }).errors,
    ).toEqual([]);
  });

  it("rejects an invalid Supabase origin", () => {
    const parsed = config({
      NEXT_PUBLIC_SUPABASE_URL: "not a url",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-value",
    });

    expect(parsed.supabase).toBeNull();
    expect(parsed.errors.map((error) => error.variable)).toContain(
      "NEXT_PUBLIC_SUPABASE_URL",
    );
  });

  it("selects optional local evidence only when explicitly enabled", () => {
    const parsed = config({
      RELEASE_GATE_LOCAL: "1",
      RELEASE_GATE_CONTAINER: "true",
    });

    expect(parsed.local.enabled).toBe(true);
    expect(parsed.local.install).toBe(false);
    expect(parsed.container).toBe(true);
  });

  it("reads the evidence path from the environment without touching a fixed file", () => {
    expect(config({}).reportPath).toBe("release-gate-report.json");
    expect(
      config({ RELEASE_GATE_REPORT: "tmp/evidence.json" }).reportPath,
    ).toBe("tmp/evidence.json");
  });
});
