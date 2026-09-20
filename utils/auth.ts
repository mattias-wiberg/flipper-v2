import { z } from "zod";

export const AUTHENTICATED_REDIRECT = "/authenticated/deals";
export const PASSWORD_RESET_REDIRECT = "/authenticated/reset-password";

const email = z.string().email("Enter a valid email address.");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z
  .object({
    nickname: z.string().optional(),
    email,
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email });

export const passwordUpdateSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export function getValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid form data";
}

function normalizeOrigin(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function getRequestOrigin(requestHeaders: Headers) {
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

  return (
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
    "http://localhost:3000"
  );
}

export function getSafeRedirectPath(
  requestedPath: string | null | undefined,
  origin: string
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
  origin: string
) {
  return new URL(getSafeRedirectPath(requestedPath, origin), origin);
}
