export const CANONICAL_SITE_URL = "https://flipper.mattiaswiberg.com";
export const LOCAL_SITE_URL = "http://localhost:3000";

export type SiteUrlEnvironment = Readonly<Record<string, string | undefined>>;

export function normalizeOrigin(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export function normalizeSiteUrl(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export function getSiteUrl(
  environment: SiteUrlEnvironment = process.env,
  nodeEnv: string | undefined = process.env.NODE_ENV,
) {
  const configuredOrigin = normalizeSiteUrl(environment.NEXT_PUBLIC_SITE_URL);
  if (nodeEnv === "production") {
    return configuredOrigin === CANONICAL_SITE_URL
      ? configuredOrigin
      : CANONICAL_SITE_URL;
  }

  if (configuredOrigin) {
    return configuredOrigin;
  }

  return LOCAL_SITE_URL;
}
