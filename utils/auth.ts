import {
  getSiteUrl,
  normalizeOrigin,
  type SiteUrlEnvironment,
} from "@/lib/site-url";
import { z } from "zod";

export const AUTHENTICATED_REDIRECT = "/authenticated/deals";
export const PASSWORD_RESET_REDIRECT = "/authenticated/reset-password";

const email = z.email({ error: "Enter a valid email address." });

export const signInSchema = z.object({
  email,
  password: z.string().min(1, { error: "Password is required" }),
});

export const signUpSchema = z
  .object({
    nickname: z.string().optional(),
    email,
    password: z
      .string()
      .min(6, { error: "Password must be at least 6 characters" }),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    error: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email });

export const passwordUpdateSchema = z
  .object({
    password: z
      .string()
      .min(6, { error: "Password must be at least 6 characters" }),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    error: "Passwords don't match",
    path: ["confirmPassword"],
  });

export function getValidationMessage(error: z.ZodError<unknown>) {
  return error.issues[0]?.message ?? "Invalid form data";
}

export function getRequestOrigin(
  requestHeaders: Headers,
  environment: SiteUrlEnvironment = process.env,
) {
  if (environment.NODE_ENV === "production") {
    return getSiteUrl(environment, "production");
  }

  const origin = normalizeOrigin(requestHeaders.get("origin"));
  if (origin) {
    return origin;
  }

  const host =
    requestHeaders.get("x-forwarded-host")?.split(",")[0].trim() ??
    requestHeaders.get("host");
  if (host) {
    const protocol =
      requestHeaders.get("x-forwarded-proto")?.split(",")[0].trim() ??
      (host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https");
    return `${protocol}://${host}`;
  }

  return getSiteUrl(environment, "development");
}

export function getSafeRedirectPath(
  requestedPath: string | null | undefined,
  origin: string,
) {
  if (
    !requestedPath ||
    !requestedPath.startsWith("/") ||
    requestedPath.startsWith("//")
  ) {
    return AUTHENTICATED_REDIRECT;
  }

  try {
    const requestedUrl = new URL(requestedPath, origin);
    if (requestedUrl.origin !== origin) {
      return AUTHENTICATED_REDIRECT;
    }

    return `${requestedUrl.pathname}${requestedUrl.search}${requestedUrl.hash}`;
  } catch {
    return AUTHENTICATED_REDIRECT;
  }
}

export function getSafeRedirectUrl(
  requestedPath: string | null | undefined,
  origin: string,
) {
  return new URL(getSafeRedirectPath(requestedPath, origin), origin);
}
