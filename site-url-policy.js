const siteUrlConfig = require("./site-url.config.json");

const CANONICAL_SITE_URL = siteUrlConfig.canonicalSiteUrl;
const LOCAL_SITE_URL = "http://localhost:3000";

function normalizeOrigin(value) {
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

function normalizeSiteUrl(value) {
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

function isCanonicalSiteUrl(value) {
  return normalizeSiteUrl(value) === CANONICAL_SITE_URL;
}

module.exports = {
  CANONICAL_SITE_URL,
  LOCAL_SITE_URL,
  isCanonicalSiteUrl,
  normalizeOrigin,
  normalizeSiteUrl,
};
