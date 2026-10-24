import {
  findSensitiveValues,
  redactSecrets,
  scanBeaconPayload,
  stripUrlSecrets,
} from "./sensitive.js";

const WEBSITE_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

function pageView(overrides: Record<string, unknown> = {}) {
  return {
    type: "pageview",
    payload: {
      website: WEBSITE_ID,
      hostname: "flipper.mattiaswiberg.com",
      url: "/documentation",
      referrer: "/",
      title: "Documentation | Flipper",
      language: "en-GB",
      screen: "1280x800",
      ...overrides,
    },
  };
}

describe("sensitive-value detection", () => {
  it("accepts an ordinary page-view beacon", () => {
    expect(scanBeaconPayload(pageView())).toEqual([]);
  });

  it("accepts an event beacon and a performance beacon from the real tracker shape", () => {
    expect(
      scanBeaconPayload({
        type: "event",
        payload: {
          website: WEBSITE_ID,
          screen: "1280x800",
          language: "en-GB",
          title: "Flipper",
          hostname: "flipper.mattiaswiberg.com",
          url: "/",
          referrer: "",
          tag: "gate",
          name: "theme_change",
          data: { theme: "dark" },
        },
      }),
    ).toEqual([]);

    expect(
      scanBeaconPayload({
        type: "performance",
        payload: {
          website: WEBSITE_ID,
          hostname: "flipper.mattiaswiberg.com",
          url: "/",
          title: "Flipper",
          language: "en-GB",
          screen: "1280x800",
          ttfb: 42,
          fcp: 120,
          lcp: 240,
          cls: 0.01,
          inp: 80,
          duration: 1000,
        },
      }),
    ).toEqual([]);
  });

  it("rejects an identity id on the beacon", () => {
    expect(scanBeaconPayload(pageView({ id: "cached-session-id" }))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "identity-field" }),
      ]),
    );
  });

  it("rejects unexpected beacon fields, identity fields, and unlisted event data", () => {
    const findings = scanBeaconPayload({
      type: "event",
      payload: {
        website: WEBSITE_ID,
        hostname: "flipper.mattiaswiberg.com",
        url: "/",
        event: "theme_change",
        distinctId: "user-1",
        data: { theme: "dark", email: "someone@example.test" },
      },
    });

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "identity-field" }),
        expect.objectContaining({ rule: "unexpected-event-field" }),
      ]),
    );
  });

  it("rejects a tracked URL that kept its query string or hash", () => {
    expect(
      scanBeaconPayload(pageView({ url: "/auth/callback?code=abc123" })),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "credential-query" }),
      ]),
    );
    expect(
      scanBeaconPayload(pageView({ url: "/reset#access_token=abc" })),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "credential-query" }),
      ]),
    );
  });

  it("detects emails, JWTs, cookies, and long hex secrets without returning the value", () => {
    const value = {
      email: "trader@example.test",
      authorization: "Bearer abcdefghijklmnopqrstuvwxyz",
      cookie: "sb-projectref-auth-token.0=value",
      token:
        "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.c2lnbmF0dXJlLXZhbHVl",
      hex: "0123456789abcdef0123456789abcdef01234567",
    };

    const findings = findSensitiveValues(value);
    const rules = findings.map((finding) => finding.rule);

    expect(rules).toEqual(
      expect.arrayContaining([
        "email",
        "bearer-token",
        "auth-cookie",
        "jwt",
        "long-hex-secret",
      ]),
    );
    expect(JSON.stringify(findings)).not.toContain("trader@example.test");
  });

  it("leaves ordinary product strings alone", () => {
    expect(
      findSensitiveValues({
        url: "/authenticated/deals?tier=8",
        title: "Reset Password | Flipper",
        website: WEBSITE_ID,
      }),
    ).toEqual([]);
  });

  it("redacts known secrets in raw and URL-encoded form and ignores short values", () => {
    const secret = "super-secret-value";
    const text = `cookie=${secret}&encoded=${encodeURIComponent(secret)} token=abc`;

    const redacted = redactSecrets(text, [secret, "abc"]);

    expect(redacted).not.toContain(secret);
    expect(redacted).not.toContain(encodeURIComponent(secret));
    expect(redacted).toContain("token=abc");
    expect(redacted.match(/\[redacted\]/g)).toHaveLength(2);
  });

  it("strips query strings and hashes from URLs in diagnostics", () => {
    const text =
      'navigated to "https://beta.example.test/log-in?error=Invalid%20login" and https://beta.example.test/reset#access_token=abc';

    expect(stripUrlSecrets(text)).toBe(
      'navigated to "https://beta.example.test/log-in" and https://beta.example.test/reset',
    );
  });
});
