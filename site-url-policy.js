// Single source of truth for the public origin contract: site-url.config.json.
//
// Migration phase (Vercel -> home-lab Dokploy): the application runs at
// https://beta.flipper.mattiaswiberg.com, so that is the configured public
// origin. The apex https://flipper.mattiaswiberg.com stays on Vercel until
// final cutover and remains the documented final canonical origin. The final
// cutover flips `canonicalSiteUrl` back to https://flipper.mattiaswiberg.com
// together with the DNS repoint and the Supabase Auth Site URL / redirect
// allowlist update. Production never falls back to VERCEL_URL or localhost;
// only local development derives http://localhost:3000.
const siteUrlConfig = require("./site-url.config.json");

const CANONICAL_SITE_URL = siteUrlConfig.canonicalSiteUrl;
const LOCAL_SITE_URL = "http://localhost:3000";

function normalizeOrigin(value) {
  return parseHttpUrl(value)?.origin ?? null;
}

function parseHttpUrl(value) {
  if (!value?.trim()) {
    return null;
  }

  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function parseSiteUrl(value) {
  const url = parseHttpUrl(value);
  if (!url || url.pathname !== "/" || url.search || url.hash) {
    return null;
  }

  return url;
}

function normalizeSiteUrl(value) {
  return parseSiteUrl(value)?.origin ?? null;
}

function isCanonicalSiteUrl(value) {
  return normalizeSiteUrl(value) === CANONICAL_SITE_URL;
}

// The configured public origin must itself be a bare http(s) origin without
// credentials, path, query, or hash. Fail closed at load time and name the
// configuration key only; never echo the configured value in diagnostics.
if (normalizeSiteUrl(CANONICAL_SITE_URL) !== CANONICAL_SITE_URL) {
  throw new Error(
    "Invalid configured origin for canonicalSiteUrl in site-url.config.json",
  );
}

module.exports = {
  CANONICAL_SITE_URL,
  LOCAL_SITE_URL,
  isCanonicalSiteUrl,
  normalizeOrigin,
  normalizeSiteUrl,
  parseSiteUrl,
};
