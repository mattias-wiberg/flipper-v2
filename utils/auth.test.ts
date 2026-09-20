import {
  AUTHENTICATED_REDIRECT,
  forgotPasswordSchema,
  getRequestOrigin,
  getSafeRedirectUrl,
  getSafeRedirectPath,
  passwordUpdateSchema,
  signInSchema,
  signUpSchema,
} from "./auth";

describe("auth boundaries", () => {
  const origin = "https://flipper.example";

  it("only allows same-origin absolute paths for auth redirects", () => {
    expect(getSafeRedirectPath("/authenticated/reset-password", origin)).toBe(
      "/authenticated/reset-password"
    );
    expect(getSafeRedirectPath("https://attacker.example/steal", origin)).toBe(
      AUTHENTICATED_REDIRECT
    );
    expect(getSafeRedirectPath("//attacker.example/steal", origin)).toBe(
      AUTHENTICATED_REDIRECT
    );
    expect(getSafeRedirectPath("authenticated/reset-password", origin)).toBe(
      AUTHENTICATED_REDIRECT
    );
  });

  it("builds a same-origin callback URL and preserves safe query data", () => {
    expect(
      getSafeRedirectUrl(
        "/authenticated/reset-password?source=email#password",
        origin
      ).toString()
    ).toBe(
      "https://flipper.example/authenticated/reset-password?source=email#password"
    );
    expect(getSafeRedirectUrl("https://attacker.example/steal", origin).toString()).toBe(
      "https://flipper.example/authenticated/deals"
    );
  });

  it("uses the request origin before deployment fallbacks", () => {
    const headers = new Headers({
      origin: "https://flipper.example/some-page",
      host: "ignored.example",
    });

    expect(getRequestOrigin(headers)).toBe(origin);
  });

  it("rejects invalid credentials at the server validation seam", () => {
    expect(
      signInSchema.safeParse({ email: "not-an-email", password: "secret" })
        .success
    ).toBe(false);
    expect(
      signUpSchema.safeParse({
        email: "user@example.com",
        password: "secret",
        confirmPassword: "different",
      }).success
    ).toBe(false);
    expect(
      forgotPasswordSchema.safeParse({ email: "not-an-email" }).success
    ).toBe(false);
    expect(
      passwordUpdateSchema.safeParse({
        password: "secret",
        confirmPassword: "different",
      }).success
    ).toBe(false);
  });
});
