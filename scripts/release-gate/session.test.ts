import {
  ageSession,
  decodeSessionValue,
  encodeSessionCookies,
  findSessionCookie,
  readSessionCookie,
} from "./session.js";

const COOKIE = "sb-projectref-auth-token";

function session(overrides: Record<string, unknown> = {}) {
  return {
    access_token: "header.payload.signature",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: 1_800_000_000,
    refresh_token: "refresh-token-value",
    user: { id: "user-1", email: "trader@example.test" },
    ...overrides,
  };
}

describe("session cookie helpers", () => {
  it("round-trips a single session cookie", () => {
    const cookies = encodeSessionCookies(COOKIE, session());

    expect(cookies).toHaveLength(1);
    expect(cookies[0]?.name).toBe(COOKIE);
    expect(decodeSessionValue(cookies[0]?.value ?? "")).toMatchObject({
      refresh_token: "refresh-token-value",
    });

    const read = readSessionCookie(cookies);
    expect(read?.name).toBe(COOKIE);
    expect(read?.session.expires_at).toBe(1_800_000_000);
  });

  it("splits and recombines a large session like @supabase/ssr", () => {
    const cookies = encodeSessionCookies(
      COOKIE,
      session({ access_token: "x".repeat(6000) }),
    );

    expect(cookies.length).toBeGreaterThan(1);
    expect(cookies.map((cookie) => cookie.name)).toEqual(
      cookies.map((_, index) => `${COOKIE}.${index}`),
    );

    const read = readSessionCookie(cookies);
    expect(read?.session.access_token).toHaveLength(6000);
  });

  it("resolves the source cookie when @supabase/ssr chunked the session", () => {
    const cookies = encodeSessionCookies(
      COOKIE,
      session({ access_token: "x".repeat(6000) }),
    );
    const read = readSessionCookie(cookies);

    expect(cookies.length).toBeGreaterThan(1);
    expect(read?.name).toBe(COOKIE);
    expect(findSessionCookie(cookies, read?.name ?? "")?.name).toBe(
      `${COOKIE}.0`,
    );
    expect(
      findSessionCookie(cookies, "sb-other-project-auth-token"),
    ).toBeUndefined();
  });

  it("ages the access token while keeping the real refresh token", () => {
    const now = 1_900_000_000_000;
    const aged = ageSession(session(), now);

    expect(aged.expires_at).toBe(Math.floor(now / 1000) - 60);
    expect(aged.refresh_token).toBe("refresh-token-value");
  });

  it("returns null for unrelated or unreadable cookies", () => {
    expect(readSessionCookie([{ name: "theme", value: "dark" }])).toBeNull();
    expect(readSessionCookie([{ name: COOKIE, value: "not-json" }])).toBeNull();
  });
});
