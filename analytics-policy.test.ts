import {
  ANALYTIC_EVENTS,
  buildAnalyticsEvent,
  getUmamiConfig,
  getUmamiScriptAttributes,
  sanitizeAnalyticsValue,
  umamiConfigDiagnostic,
} from "./analytics-policy.js";
import { CANONICAL_SITE_URL } from "./site-url-policy.js";

const SCRIPT_URL = "https://umami.mattiaswiberg.com/script.js";
const WEBSITE_ID = "94db1cb1-74f4-4a40-ad6c-962362670409";
const TRACKING_HOSTNAME = new URL(CANONICAL_SITE_URL).hostname;

describe("Umami analytics configuration", () => {
  it("disables analytics when both optional settings are absent", () => {
    for (const environment of [{}, { NEXT_PUBLIC_UMAMI_SCRIPT_URL: "  " }]) {
      const config = getUmamiConfig(environment);
      expect(config).toEqual({ status: "disabled" });
      expect(umamiConfigDiagnostic(config)).toBeNull();
      expect(getUmamiScriptAttributes(config)).toBeNull();
    }
  });

  it("disables analytics on partial configuration with a name-only diagnostic", () => {
    const partialEnvironments = [
      { NEXT_PUBLIC_UMAMI_SCRIPT_URL: SCRIPT_URL },
      { NEXT_PUBLIC_UMAMI_WEBSITE_ID: WEBSITE_ID },
    ];

    for (const environment of partialEnvironments) {
      const config = getUmamiConfig(environment);
      expect(config.status).toBe("invalid");
      if (config.status === "invalid") {
        expect([...config.invalidNames].sort()).toEqual([
          "NEXT_PUBLIC_UMAMI_SCRIPT_URL",
          "NEXT_PUBLIC_UMAMI_WEBSITE_ID",
        ]);
      }

      const diagnostic = umamiConfigDiagnostic(config);
      expect(diagnostic).toContain("NEXT_PUBLIC_UMAMI_SCRIPT_URL");
      expect(diagnostic).toContain("NEXT_PUBLIC_UMAMI_WEBSITE_ID");
      for (const value of Object.values(environment)) {
        expect(diagnostic).not.toContain(value as string);
      }

      expect(getUmamiScriptAttributes(config)).toBeNull();
    }
  });

  it("rejects invalid values by variable name only and keeps analytics off", () => {
    const invalidEnvironments = [
      {
        environment: {
          NEXT_PUBLIC_UMAMI_SCRIPT_URL:
            "https://script-user:script-secret@umami.example/script.js",
          NEXT_PUBLIC_UMAMI_WEBSITE_ID: WEBSITE_ID,
        },
        names: ["NEXT_PUBLIC_UMAMI_SCRIPT_URL"],
        secrets: ["script-secret"],
      },
      {
        environment: {
          NEXT_PUBLIC_UMAMI_SCRIPT_URL: "file:///etc/passwd",
          NEXT_PUBLIC_UMAMI_WEBSITE_ID: WEBSITE_ID,
        },
        names: ["NEXT_PUBLIC_UMAMI_SCRIPT_URL"],
        secrets: ["/etc/passwd"],
      },
      {
        environment: {
          NEXT_PUBLIC_UMAMI_SCRIPT_URL:
            "http://umami.mattiaswiberg.com/script.js",
          NEXT_PUBLIC_UMAMI_WEBSITE_ID: WEBSITE_ID,
        },
        names: ["NEXT_PUBLIC_UMAMI_SCRIPT_URL"],
        secrets: ["http://umami.mattiaswiberg.com/script.js"],
      },
      {
        environment: {
          NEXT_PUBLIC_UMAMI_SCRIPT_URL: `${SCRIPT_URL}?v=1`,
          NEXT_PUBLIC_UMAMI_WEBSITE_ID: WEBSITE_ID,
        },
        names: ["NEXT_PUBLIC_UMAMI_SCRIPT_URL"],
        secrets: ["?v=1"],
      },
      {
        environment: {
          NEXT_PUBLIC_UMAMI_SCRIPT_URL: SCRIPT_URL,
          NEXT_PUBLIC_UMAMI_WEBSITE_ID: "not a website id!",
        },
        names: ["NEXT_PUBLIC_UMAMI_WEBSITE_ID"],
        secrets: ["not a website id!"],
      },
    ];

    for (const { environment, names, secrets } of invalidEnvironments) {
      const config = getUmamiConfig(environment);
      expect(config.status).toBe("invalid");
      if (config.status === "invalid") {
        expect([...config.invalidNames]).toEqual(names);
      }

      const diagnostic = umamiConfigDiagnostic(config);
      for (const name of names) {
        expect(diagnostic).toContain(name);
      }
      for (const secret of secrets) {
        expect(diagnostic).not.toContain(secret);
      }

      expect(getUmamiScriptAttributes(config)).toBeNull();
    }
  });

  it("enables analytics for a complete valid configuration", () => {
    const config = getUmamiConfig({
      NEXT_PUBLIC_UMAMI_SCRIPT_URL: ` ${SCRIPT_URL} `,
      NEXT_PUBLIC_UMAMI_WEBSITE_ID: ` ${WEBSITE_ID} `,
    });

    expect(config).toEqual({
      status: "enabled",
      scriptUrl: SCRIPT_URL,
      websiteId: WEBSITE_ID,
      hostname: TRACKING_HOSTNAME,
    });
    expect(umamiConfigDiagnostic(config)).toBeNull();
  });

  it("keeps the tracker payload free of identity and sensitive URL data", () => {
    const config = getUmamiConfig({
      NEXT_PUBLIC_UMAMI_SCRIPT_URL: SCRIPT_URL,
      NEXT_PUBLIC_UMAMI_WEBSITE_ID: WEBSITE_ID,
    });
    const attributes = getUmamiScriptAttributes(config);

    expect(attributes).toEqual({
      src: SCRIPT_URL,
      "data-website-id": WEBSITE_ID,
      "data-domains": TRACKING_HOSTNAME,
      // Query strings (Auth codes) and hashes (reset tokens) never leave the
      // browser in tracked URLs.
      "data-exclude-search": "true",
      "data-exclude-hash": "true",
      "data-do-not-track": "true",
    });
    // No authenticated identity is ever attached.
    expect(attributes).not.toHaveProperty("data-distinct-id");
  });
});

describe("Umami analytics event contract", () => {
  it("only allows explicitly defined non-sensitive events", () => {
    expect(Object.keys(ANALYTIC_EVENTS)).toEqual(["theme_change"]);

    for (const name of [
      "identify",
      "login",
      "purchase",
      "user_email",
      "ingest_order",
      "theme_change ", // names must match exactly
    ]) {
      expect(buildAnalyticsEvent(name, {})).toBeNull();
    }

    // Inherited object names must not be mistaken for allowlisted events.
    for (const name of [
      "constructor",
      "toString",
      "__proto__",
      "hasOwnProperty",
    ]) {
      expect(() => buildAnalyticsEvent(name, { theme: "dark" })).not.toThrow();
      expect(buildAnalyticsEvent(name, { theme: "dark" })).toBeNull();
    }

    expect(buildAnalyticsEvent("theme_change", { theme: "dark" })).toEqual({
      name: "theme_change",
      data: { theme: "dark" },
    });
  });

  it("never treats inherited object properties as allowlisted events", () => {
    for (const name of [
      "constructor",
      "toString",
      "hasOwnProperty",
      "__proto__",
    ]) {
      expect(() => buildAnalyticsEvent(name, {})).not.toThrow();
      expect(buildAnalyticsEvent(name, {})).toBeNull();
    }
  });

  it("redacts values that could carry identity, credentials, or payloads", () => {
    const sensitiveValues = [
      "user@example.com",
      "https://flipper.mattiaswiberg.com/api/secret-token/orders",
      "sb-secret-key-00000000000000000000000000000000000000000000",
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.signature-token-value",
      "sup3r-s3cret-p4ssw0rd!",
      "a".repeat(33),
      { raw: "order payload" },
      ["order", "payload"],
    ];

    for (const value of sensitiveValues) {
      expect(sanitizeAnalyticsValue(value)).toBeNull();
    }

    expect(
      buildAnalyticsEvent("theme_change", { theme: "user@example.com" }),
    ).toEqual({ name: "theme_change", data: {} });
  });

  it("drops keys the event is not allowed to carry", () => {
    expect(
      buildAnalyticsEvent("theme_change", {
        theme: "light",
        email: "user@example.com",
        token: "a".repeat(20),
        distinctId: "some-user-id",
      }),
    ).toEqual({ name: "theme_change", data: { theme: "light" } });
  });

  it("accepts only short inert token values", () => {
    expect(sanitizeAnalyticsValue("dark")).toBe("dark");
    expect(sanitizeAnalyticsValue("system")).toBe("system");
    expect(sanitizeAnalyticsValue("light mode")).toBe("light mode");
    expect(sanitizeAnalyticsValue(true)).toBe(true);
    expect(sanitizeAnalyticsValue(3)).toBe(3);
    expect(sanitizeAnalyticsValue(Number.NaN)).toBeNull();
  });
});
