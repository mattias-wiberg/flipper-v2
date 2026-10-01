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

module.exports = {
  CANONICAL_SITE_URL,
  LOCAL_SITE_URL,
  isCanonicalSiteUrl,
  normalizeOrigin,
  normalizeSiteUrl,
  parseSiteUrl,
};
