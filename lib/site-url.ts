import {
  CANONICAL_SITE_URL,
  isCanonicalSiteUrl,
  LOCAL_SITE_URL,
  normalizeOrigin,
  normalizeSiteUrl,
} from "../site-url-policy.js";

export {
  CANONICAL_SITE_URL,
  LOCAL_SITE_URL,
  normalizeOrigin,
  normalizeSiteUrl,
};

export type SiteUrlEnvironment = Readonly<Record<string, string | undefined>>;

export function getSiteUrl(
  environment: SiteUrlEnvironment = process.env,
  nodeEnv: string | undefined = process.env.NODE_ENV,
) {
  const configuredValue = environment.NEXT_PUBLIC_SITE_URL;
  const configuredOrigin = normalizeSiteUrl(configuredValue);
  if (nodeEnv === "production") {
    if (!configuredValue?.trim()) {
      throw new Error(
        "Missing required environment variable: NEXT_PUBLIC_SITE_URL",
      );
    }

    if (!isCanonicalSiteUrl(configuredValue)) {
      throw new Error("Invalid environment variable: NEXT_PUBLIC_SITE_URL");
    }

    return CANONICAL_SITE_URL;
  }

  if (configuredOrigin) {
    return configuredOrigin;
  }

  return LOCAL_SITE_URL;
}
