jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

import { CANONICAL_SITE_URL } from "@/lib/site-url";
import { NextRequest } from "next/server";
import { updateSession } from "./middleware";

const mockCreateServerClient = jest.mocked(
  jest.requireMock("@supabase/ssr").createServerClient,
);

const ORIGIN = "https://beta.flipper.mattiaswiberg.com";

const mutableEnv = process.env as Record<string, string | undefined>;
function restoreNodeEnv(value: string | undefined) {
  if (value === undefined) {
    delete mutableEnv.NODE_ENV;
  } else {
    mutableEnv.NODE_ENV = value;
  }
}
const AUTHENTICATED_CLAIMS = {
  data: { claims: { sub: "user-1" } },
  error: null,
};
const NO_CLAIMS = {
  data: { claims: null },
  error: new Error("Auth session missing"),
};

type RefreshCookie = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

type ServerClientOptions = {
  cookies: {
    setAll: (
      cookiesToSet: RefreshCookie[],
      headers: Record<string, string>,
    ) => void;
  };
};

function makeRequest(
  path: string,
  headers: Record<string, string> = {},
  cookie?: string,
) {
  return new NextRequest(`${ORIGIN}${path}`, {
    headers: cookie ? { ...headers, cookie } : headers,
  });
}

function configureSession(
  claimsResult: typeof AUTHENTICATED_CLAIMS | typeof NO_CLAIMS,
  refreshCookies?: RefreshCookie[],
) {
  const getClaims = jest.fn().mockImplementation(async () => {
    if (refreshCookies) {
      const options = capturedOptions();
      options.cookies.setAll(refreshCookies, {});
    }

    return claimsResult;
  });
  mockCreateServerClient.mockImplementation(
    (_url: string, _key: string, options: ServerClientOptions) => {
      lastOptions = options;
      return { auth: { getClaims } };
    },
  );
  return getClaims;
}

let lastOptions: ServerClientOptions | undefined;
function capturedOptions() {
  if (!lastOptions) {
    throw new Error("createServerClient was not called");
  }
  return lastOptions;
}

describe("session handling behind the proxy at the beta origin", () => {
  const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const previousSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const previousNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    mockCreateServerClient.mockReset();
    lastOptions = undefined;
    process.env.NEXT_PUBLIC_SITE_URL = CANONICAL_SITE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-key";
    mutableEnv.NODE_ENV = "production";
  });

  afterAll(() => {
    restoreNodeEnv(previousNodeEnv);
    for (const [name, value] of [
      ["NEXT_PUBLIC_SITE_URL", previousSiteUrl],
      ["NEXT_PUBLIC_SUPABASE_URL", previousSupabaseUrl],
      ["NEXT_PUBLIC_SUPABASE_ANON_KEY", previousAnonKey],
    ] as const) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  });

  it("redirects unauthenticated protected access to the configured beta login origin", async () => {
    configureSession(NO_CLAIMS);

    const response = await updateSession(
      makeRequest("/authenticated/deals", {
        host: "attacker.example",
        "x-forwarded-host": "attacker.example",
        "x-forwarded-proto": "http",
        origin: "https://attacker.example",
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/log-in`);
    expect(mockCreateServerClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "public-anon-key",
      expect.anything(),
    );
  });

  it("keeps protected access and refreshes session cookies behind the proxy", async () => {
    const getClaims = configureSession(AUTHENTICATED_CLAIMS, [
      {
        name: "sb-access-token",
        value: "refreshed-token",
        options: { path: "/", httpOnly: true },
      },
    ]);

    const response = await updateSession(
      makeRequest(
        "/authenticated/deals",
        {},
        "sb-access-token=stale-token; sb-refresh-token=refresh-token",
      ),
    );

    expect(getClaims).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(
      response.cookies
        .getAll()
        .some(
          (cookie: { name: string; value: string }) =>
            cookie.name === "sb-access-token" &&
            cookie.value === "refreshed-token",
        ),
    ).toBe(true);
  });

  it("redirects authenticated users from the login surface to deal discovery", async () => {
    configureSession(AUTHENTICATED_CLAIMS, [
      { name: "sb-access-token", value: "refreshed-token" },
    ]);

    const response = await updateSession(makeRequest("/log-in"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${ORIGIN}/authenticated/deals`,
    );
    expect(
      response.cookies
        .getAll()
        .some(
          (cookie: { name: string; value: string }) =>
            cookie.name === "sb-access-token" &&
            cookie.value === "refreshed-token",
        ),
    ).toBe(true);
  });

  it("leaves unauthenticated public requests untouched", async () => {
    configureSession(NO_CLAIMS);

    const response = await updateSession(makeRequest("/documentation"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("passes public requests through without Supabase when the client env is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const response = await updateSession(makeRequest("/documentation"));

    expect(mockCreateServerClient).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  function configureThrowingSession() {
    mockCreateServerClient.mockImplementation(() => ({
      auth: { getClaims: jest.fn().mockRejectedValue(new Error("boom")) },
    }));
  }

  it("falls back to the beta login redirect when session handling throws", async () => {
    configureThrowingSession();

    const response = await updateSession(makeRequest("/authenticated/deals"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/log-in`);
  });

  it("passes public requests through when session handling throws", async () => {
    configureThrowingSession();

    const response = await updateSession(makeRequest("/documentation"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
