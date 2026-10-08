import {
  AUTHENTICATED_REDIRECT,
  PASSWORD_RESET_REDIRECT,
  forgotPasswordSchema,
  getRequestOrigin,
  getSafeRedirectUrl,
  getSafeRedirectPath,
  passwordUpdateSchema,
  signInSchema,
  signUpSchema,
} from "./auth";
import { CANONICAL_SITE_URL, LOCAL_SITE_URL } from "@/lib/site-url";

describe("auth boundaries", () => {
  const origin = "https://flipper.example";

  it("only allows same-origin absolute paths for auth redirects", () => {
    expect(getSafeRedirectPath("/authenticated/reset-password", origin)).toBe(
      "/authenticated/reset-password",
    );
    expect(getSafeRedirectPath("https://attacker.example/steal", origin)).toBe(
      AUTHENTICATED_REDIRECT,
    );
    expect(getSafeRedirectPath("//attacker.example/steal", origin)).toBe(
      AUTHENTICATED_REDIRECT,
    );
    expect(getSafeRedirectPath("authenticated/reset-password", origin)).toBe(
      AUTHENTICATED_REDIRECT,
    );
  });

  it("builds a same-origin callback URL and preserves safe query data", () => {
    expect(
      getSafeRedirectUrl(
        "/authenticated/reset-password?source=email#password",
        origin,
      ).toString(),
    ).toBe(
      "https://flipper.example/authenticated/reset-password?source=email#password",
    );
    expect(
      getSafeRedirectUrl("https://attacker.example/steal", origin).toString(),
    ).toBe("https://flipper.example/authenticated/deals");
  });

  it("uses the request origin before deployment fallbacks", () => {
    const headers = new Headers({
      origin: "https://flipper.example/some-page",
      host: "ignored.example",
    });

    expect(getRequestOrigin(headers)).toBe(origin);
  });

  it("uses the canonical origin in production instead of forwarded headers", () => {
    expect(
      getRequestOrigin(
        new Headers({
          origin: "https://attacker.example",
          host: "attacker.example",
          "x-forwarded-host": "attacker.example",
          "x-forwarded-proto": "http",
        }),
        {
          NODE_ENV: "production",
          NEXT_PUBLIC_SITE_URL: CANONICAL_SITE_URL,
        },
      ),
    ).toBe(CANONICAL_SITE_URL);
  });

  it("rejects invalid credentials at the server validation seam", () => {
    expect(
      signInSchema.safeParse({ email: "not-an-email", password: "secret" })
        .success,
    ).toBe(false);
    expect(
      signUpSchema.safeParse({
        email: "user@example.com",
        password: "secret",
        confirmPassword: "different",
      }).success,
    ).toBe(false);
    expect(
      forgotPasswordSchema.safeParse({ email: "not-an-email" }).success,
    ).toBe(false);
    expect(
      passwordUpdateSchema.safeParse({
        password: "secret",
        confirmPassword: "different",
      }).success,
    ).toBe(false);
  });
});

describe("password recovery redirect_to handling at the beta origin", () => {
  const origin = CANONICAL_SITE_URL;

  it("keeps the recovery redirect_to on the configured beta origin", () => {
    expect(getSafeRedirectPath(PASSWORD_RESET_REDIRECT, origin)).toBe(
      "/authenticated/reset-password",
    );
    expect(getSafeRedirectUrl(PASSWORD_RESET_REDIRECT, origin).toString()).toBe(
      "https://beta.flipper.mattiaswiberg.com/authenticated/reset-password",
    );
  });

  it("falls back to deal discovery when redirect_to is missing or escapes", () => {
    for (const target of [
      undefined,
      null,
      "",
      "https://attacker.example/steal",
      "https://beta.flipper.mattiaswiberg.com.evil.example/steal",
      "https://attacker.example/steal?next=https://beta.flipper.mattiaswiberg.com",
      "http://beta.flipper.mattiaswiberg.com/steal",
      "//attacker.example/steal",
      "/\\attacker.example/steal",
      "\\\\attacker.example/steal",
      "authenticated/reset-password",
    ]) {
      expect(getSafeRedirectPath(target, origin)).toBe(AUTHENTICATED_REDIRECT);
      expect(getSafeRedirectUrl(target, origin).toString()).toBe(
        "https://beta.flipper.mattiaswiberg.com/authenticated/deals",
      );
    }
  });

  it("keeps encoded and mixed traversal inputs inside the beta origin", () => {
    for (const target of [
      "/%2f%2fattacker.example/steal",
      "/%2e%2e/%2e%2e/steal",
      "/%5c%5cattacker.example",
      "/..%2f..%2fsteal",
      "/%2f%2f%2f%2fattacker.example",
    ]) {
      const path = getSafeRedirectPath(target, origin);
      expect(path.startsWith("/") && !path.startsWith("//")).toBe(true);

      const url = getSafeRedirectUrl(target, origin);
      expect(url.origin).toBe(origin);
    }
  });

  it("preserves safe query data on allowed local targets", () => {
    expect(
      getSafeRedirectUrl(
        "/authenticated/reset-password?source=recovery#password",
        origin,
      ).toString(),
    ).toBe(
      "https://beta.flipper.mattiaswiberg.com/authenticated/reset-password?source=recovery#password",
    );
  });
});

describe("origin selection behind the proxy", () => {
  it("returns the configured beta origin in production regardless of forwarded headers", () => {
    expect(
      getRequestOrigin(
        new Headers({
          origin: "https://attacker.example",
          host: "attacker.example",
          "x-forwarded-host": "attacker.example",
          "x-forwarded-proto": "http",
        }),
        {
          NODE_ENV: "production",
          NEXT_PUBLIC_SITE_URL: CANONICAL_SITE_URL,
        },
      ),
    ).toBe("https://beta.flipper.mattiaswiberg.com");
  });

  it("rejects a non-canonical configured origin in production", () => {
    expect(() =>
      getRequestOrigin(new Headers({}), {
        NODE_ENV: "production",
        NEXT_PUBLIC_SITE_URL: "https://attacker.example",
      }),
    ).toThrow("Invalid environment variable: NEXT_PUBLIC_SITE_URL");
  });

  it("derives the local origin for local development requests", () => {
    expect(
      getRequestOrigin(new Headers({ host: "localhost:3000" }), {
        NODE_ENV: "development",
      }),
    ).toBe("http://localhost:3000");
    expect(
      getRequestOrigin(
        new Headers({
          "x-forwarded-host": "127.0.0.1:3000",
          "x-forwarded-proto": "http",
        }),
        { NODE_ENV: "development" },
      ),
    ).toBe("http://127.0.0.1:3000");
    expect(
      getRequestOrigin(new Headers({}), {
        NODE_ENV: "development",
      }),
    ).toBe(LOCAL_SITE_URL);
    expect(
      getRequestOrigin(new Headers({}), {
        NODE_ENV: "development",
        NEXT_PUBLIC_SITE_URL: CANONICAL_SITE_URL,
      }),
    ).toBe("https://beta.flipper.mattiaswiberg.com");
  });
});
