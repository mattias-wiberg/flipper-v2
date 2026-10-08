jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn(),
}));

import { CANONICAL_SITE_URL } from "@/lib/site-url";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mockCreateClient = jest.mocked(
  jest.requireMock("@/utils/supabase/server").createClient,
);

const ORIGIN = "https://beta.flipper.mattiaswiberg.com";
const ERROR_MESSAGE = "Authentication failed. Please try again.";

const mutableEnv = process.env as Record<string, string | undefined>;
function restoreNodeEnv(value: string | undefined) {
  if (value === undefined) {
    delete mutableEnv.NODE_ENV;
  } else {
    mutableEnv.NODE_ENV = value;
  }
}

function makeRequest(search: string, headers: HeadersInit = {}) {
  return new NextRequest(`${ORIGIN}/auth/callback${search}`, { headers });
}

function configureExchange(error: Error | null = null) {
  const exchangeCodeForSession = jest
    .fn()
    .mockResolvedValue({ error: error ?? null });
  mockCreateClient.mockResolvedValue({ auth: { exchangeCodeForSession } });
  return exchangeCodeForSession;
}

function parseLocation(response: Response) {
  const location = response.headers.get("location");
  expect(location).toBeTruthy();
  return new URL(location as string);
}

describe("auth callback origin and redirect behavior", () => {
  const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const previousNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    mockCreateClient.mockReset();
    process.env.NEXT_PUBLIC_SITE_URL = CANONICAL_SITE_URL;
  });

  afterAll(() => {
    restoreNodeEnv(previousNodeEnv);
    if (previousSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
    }
  });

  it("sends failures to the login surface on the configured beta origin", async () => {
    const exchangeCodeForSession = configureExchange();

    const response = await GET(makeRequest(""));
    const location = parseLocation(response);

    expect(location.origin).toBe(ORIGIN);
    expect(location.pathname).toBe("/log-in");
    expect(location.searchParams.get("error")).toBe(ERROR_MESSAGE);
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("sends a failed code exchange to the beta login surface", async () => {
    const exchangeCodeForSession = configureExchange(new Error("bad code"));

    const response = await GET(makeRequest("?code=expired"));
    const location = parseLocation(response);

    expect(exchangeCodeForSession).toHaveBeenCalledWith("expired");
    expect(location.origin).toBe(ORIGIN);
    expect(location.pathname).toBe("/log-in");
    expect(location.searchParams.get("error")).toBe(ERROR_MESSAGE);
  });

  it("returns to deal discovery when no redirect_to is given", async () => {
    configureExchange();

    const response = await GET(makeRequest("?code=valid-code"));
    const location = parseLocation(response);

    expect(location.toString()).toBe(`${ORIGIN}/authenticated/deals`);
  });

  it("returns to the password reset surface for the recovery redirect_to", async () => {
    configureExchange();

    const response = await GET(
      makeRequest(
        "?code=valid-code&redirect_to=%2Fauthenticated%2Freset-password",
      ),
    );
    const location = parseLocation(response);

    expect(location.toString()).toBe(`${ORIGIN}/authenticated/reset-password`);
  });

  it.each([
    ["absolute url", "https://attacker.example/steal"],
    [
      "lookalike host",
      "https://beta.flipper.mattiaswiberg.com.evil.example/steal",
    ],
    [
      "absolute url with trusted-looking query",
      "https://attacker.example/steal?next=https://beta.flipper.mattiaswiberg.com",
    ],
    ["scheme downgraded url", "http://beta.flipper.mattiaswiberg.com/steal"],
    ["protocol relative", "//attacker.example/steal"],
    ["backslash protocol relative", "/\\attacker.example/steal"],
  ])(
    "falls back to deal discovery when redirect_to (%s) is a literal escape",
    async (_label, redirectTarget) => {
      configureExchange();

      const response = await GET(
        makeRequest(
          `?code=valid-code&redirect_to=${encodeURIComponent(redirectTarget)}`,
        ),
      );
      const location = parseLocation(response);

      expect(location.toString()).toBe(`${ORIGIN}/authenticated/deals`);
    },
  );

  it.each([
    [
      "encoded protocol relative",
      "/%2f%2fattacker.example/steal",
      "/%2f%2fattacker.example/steal",
    ],
    ["encoded traversal", "/%2e%2e/%2e%2e/steal", "/steal"],
    [
      "encoded backslashes",
      "/%5c%5cattacker.example",
      "/%5c%5cattacker.example",
    ],
    ["mixed encoded traversal", "/..%2f..%2fsteal", "/..%2f..%2fsteal"],
  ] as const)(
    "keeps redirect_to (%s) as the on-origin path %s instead of falling back",
    async (_label, redirectTarget, expectedPath) => {
      configureExchange();

      const response = await GET(
        makeRequest(
          `?code=valid-code&redirect_to=${encodeURIComponent(redirectTarget)}`,
        ),
      );
      const location = parseLocation(response);

      // Pin the exact contained result so an over-rejection regression to the
      // fallback cannot pass silently.
      expect(location.origin).toBe(ORIGIN);
      expect(location.pathname).toBe(expectedPath);
    },
  );

  it.each([
    ["dot segment with empty segment", "/.//attacker.example"],
    ["parent segment with empty segment", "/..//attacker.example"],
    ["encoded dot segment with empty segment", "/%2e//attacker.example"],
    ["encoded parent segment with empty segment", "/%2e%2e//attacker.example"],
    ["dot segment with backslash", "/.\\\\attacker.example"],
    ["parent segment with backslash", "/..\\\\attacker.example"],
    ["nested normalization escape", "/x/..//attacker.example"],
  ])(
    "falls back to deal discovery when redirect_to (%s) normalizes to a protocol-relative path",
    async (_label, redirectTarget) => {
      configureExchange();

      const response = await GET(
        makeRequest(
          `?code=valid-code&redirect_to=${encodeURIComponent(redirectTarget)}`,
        ),
      );
      const location = parseLocation(response);

      expect(location.toString()).toBe(`${ORIGIN}/authenticated/deals`);
    },
  );

  it.each([
    ["dot segment with single backslash", "/.\\attacker.example"],
    ["parent segment with single backslash", "/..\\attacker.example"],
  ])(
    "preserves redirect_to (%s) as an on-origin path instead of falling back",
    async (_label, redirectTarget) => {
      configureExchange();

      const response = await GET(
        makeRequest(
          `?code=valid-code&redirect_to=${encodeURIComponent(redirectTarget)}`,
        ),
      );
      const location = parseLocation(response);

      expect(location.origin).toBe(ORIGIN);
      expect(location.pathname).toBe("/attacker.example");
    },
  );

  it("ignores forwarded proxy headers in production", async () => {
    mutableEnv.NODE_ENV = "production";
    try {
      configureExchange();

      const response = await GET(
        makeRequest(
          "?code=valid-code&redirect_to=%2Fauthenticated%2Freset-password",
          {
            host: "attacker.example",
            "x-forwarded-host": "attacker.example",
            "x-forwarded-proto": "http",
            origin: "https://attacker.example",
          },
        ),
      );
      const location = parseLocation(response);

      expect(location.origin).toBe(ORIGIN);
      expect(location.pathname).toBe("/authenticated/reset-password");
    } finally {
      restoreNodeEnv(previousNodeEnv);
    }
  });
});
