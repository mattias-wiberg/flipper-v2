// Single source of truth for the public origin contract: site-url.config.json.
//
// The configured public origin is the canonicalSiteUrl value in
// site-url.config.json. Production resolves only to that canonical origin and
// fails closed when NEXT_PUBLIC_SITE_URL is missing or does not match it; it
// never falls back to a deployment platform's hostname or to localhost. Only
// local development derives http://localhost:3000.
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
  parseHttpUrl,
  parseSiteUrl,
};
