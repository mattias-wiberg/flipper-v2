import {
  assertProductionEnvironment,
  getInvalidProductionEnvironmentVariables,
} from "./config";
import { CANONICAL_SITE_URL, LOCAL_SITE_URL, getSiteUrl } from "./site-url";

describe("deployment configuration", () => {
  const validEnvironment = {
    NEXT_PUBLIC_SITE_URL: CANONICAL_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "server-only-service-role-key",
  };

  it("uses a local origin without production configuration", () => {
    expect(getSiteUrl({}, "development")).toBe(LOCAL_SITE_URL);
  });

  it("requires the canonical public origin in production", () => {
    expect(() =>
      assertProductionEnvironment({
        ...validEnvironment,
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      }),
    ).toThrow(/NEXT_PUBLIC_SITE_URL/);

    expect(() => assertProductionEnvironment(validEnvironment)).not.toThrow();
  });

  it("reports public names that could expose server or monitoring secrets", () => {
    expect(
      getInvalidProductionEnvironmentVariables({
        ...validEnvironment,
        NEXT_PUBLIC_OTLP_HEADERS: "must-not-be-public",
      }),
    ).toContain("NEXT_PUBLIC_OTLP_HEADERS");
  });

  it("does not include configuration values in validation diagnostics", () => {
    const secret = "server-only-service-role-key";
    const invalidEnvironment = {
      ...validEnvironment,
      SUPABASE_SERVICE_ROLE_KEY: "",
    };
    let thrown: unknown;

    try {
      assertProductionEnvironment(invalidEnvironment);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    if (thrown instanceof Error) {
      expect(thrown.message).toContain("SUPABASE_SERVICE_ROLE_KEY");
      expect(thrown.message).not.toContain(secret);
    }
  });
});
