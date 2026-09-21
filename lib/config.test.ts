import { getServerSupabaseConfig } from "./config";
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
    expect(() => getSiteUrl({}, "production")).toThrow(/NEXT_PUBLIC_SITE_URL/);
    expect(() =>
      getSiteUrl(
        {
          ...validEnvironment,
          NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
        },
        "production",
      ),
    ).toThrow(/NEXT_PUBLIC_SITE_URL/);
    expect(getSiteUrl(validEnvironment, "production")).toBe(CANONICAL_SITE_URL);
  });

  it("does not include configuration values in validation diagnostics", () => {
    const secret = "server-only-service-role-key";
    const invalidEnvironment = {
      ...validEnvironment,
      SUPABASE_SERVICE_ROLE_KEY: "",
    };
    let thrown: unknown;

    try {
      getServerSupabaseConfig(invalidEnvironment);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    if (thrown instanceof Error) {
      expect(thrown.message).toContain("SUPABASE_SERVICE_ROLE_KEY");
      expect(thrown.message).not.toContain(secret);
    }
  });

  it("returns the server configuration required by ingestion", () => {
    expect(
      getServerSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: validEnvironment.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: validEnvironment.SUPABASE_SERVICE_ROLE_KEY,
      }),
    ).toEqual({
      url: validEnvironment.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey: validEnvironment.SUPABASE_SERVICE_ROLE_KEY,
    });
  });
});
