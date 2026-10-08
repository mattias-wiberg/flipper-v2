// Single source of truth for the self-hosted analytics (Umami) contract.
//
// Analytics is optional public configuration. It is DISABLED unless both
// NEXT_PUBLIC_UMAMI_SCRIPT_URL and NEXT_PUBLIC_UMAMI_WEBSITE_ID are set
// (all-or-nothing). A partial or invalid configuration is never fatal:
// analytics stays disabled and Flipper keeps serving public pages, Auth, and
// ingestion. Diagnostics name the environment variables only and never echo
// configured values.
//
// Privacy contract: analytics carries page views and the explicitly defined
// non-sensitive events in ANALYTIC_EVENTS only. It must never carry email
// addresses, auth cookies, Supabase keys, ingestion tokens, raw order
// payloads, passwords, or sensitive request URLs, and no authenticated
// identity is ever attached (never umami.identify or data-distinct-id).
// Sensitive request URLs are additionally kept out of page views by the
// tracker attributes returned below: query strings (for example Supabase Auth
// authorization codes) and hashes (for example password-reset tokens) are
// excluded before anything leaves the browser, and tracking is limited to the
// configured public host so development and test origins never send anything.
const siteUrlPolicy = require("./site-url-policy.js");

const UMAMI_SCRIPT_URL_VARIABLE = "NEXT_PUBLIC_UMAMI_SCRIPT_URL";
const UMAMI_WEBSITE_ID_VARIABLE = "NEXT_PUBLIC_UMAMI_WEBSITE_ID";
const UMAMI_VARIABLES = [UMAMI_SCRIPT_URL_VARIABLE, UMAMI_WEBSITE_ID_VARIABLE];

// The tracker only runs on the configured public host (never localhost or a
// deployment preview), matching the single source of truth for the origin.
const UMAMI_TRACKING_HOST = new URL(siteUrlPolicy.CANONICAL_SITE_URL).hostname;

// Explicitly defined non-sensitive analytics events. Each event lists the
// only data keys it may carry; values pass sanitizeAnalyticsValue first. An
// event that is not listed here is never tracked.
const ANALYTIC_EVENTS = {
  theme_change: ["theme"],
};

// Event data values must be short, inert tokens (for example "dark"). Emails,
// URLs, keys, tokens, and passwords do not match this pattern and are
// redacted; objects and arrays (raw payloads) are never accepted.
const SAFE_EVENT_VALUE_PATTERN = /^[A-Za-z0-9 _.-]{1,32}$/;
const WEBSITE_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

function normalizeScriptUrl(value) {
  const parsed = siteUrlPolicy.parseHttpUrl(value);
  return parsed ? parsed.toString() : null;
}

function normalizeWebsiteId(value) {
  const candidate = value?.trim();
  return candidate && WEBSITE_ID_PATTERN.test(candidate) ? candidate : null;
}

/**
 * @typedef {{ status: "disabled" } |
 *   { status: "invalid", invalidNames: string[] } |
 *   { status: "enabled", scriptUrl: string, websiteId: string, domains: string }} UmamiConfigValue
 */

/**
 * @param {Record<string, string | undefined>} [environment]
 * @returns {UmamiConfigValue}
 */
function getUmamiConfig(environment = process.env) {
  const scriptUrl = environment[UMAMI_SCRIPT_URL_VARIABLE];
  const websiteId = environment[UMAMI_WEBSITE_ID_VARIABLE];
  const scriptConfigured = Boolean(scriptUrl?.trim());
  const websiteIdConfigured = Boolean(websiteId?.trim());

  if (!scriptConfigured && !websiteIdConfigured) {
    return { status: "disabled" };
  }

  if (!scriptConfigured || !websiteIdConfigured) {
    // Partial configuration: both variables form one contract, so diagnose
    // the pair by name and fall back to disabled analytics.
    return { status: "invalid", invalidNames: [...UMAMI_VARIABLES] };
  }

  const invalidNames = [];
  const normalizedScriptUrl = normalizeScriptUrl(scriptUrl);
  if (!normalizedScriptUrl) {
    invalidNames.push(UMAMI_SCRIPT_URL_VARIABLE);
  }
  const normalizedWebsiteId = normalizeWebsiteId(websiteId);
  if (!normalizedWebsiteId) {
    invalidNames.push(UMAMI_WEBSITE_ID_VARIABLE);
  }
  if (invalidNames.length > 0) {
    return { status: "invalid", invalidNames };
  }

  return {
    status: "enabled",
    scriptUrl: normalizedScriptUrl,
    websiteId: normalizedWebsiteId,
    domains: UMAMI_TRACKING_HOST,
  };
}

// Name-only diagnostic for invalid analytics configuration. The message is
// safe to log and retain; it never contains a configured value.
/**
 * @param {UmamiConfigValue} config
 * @returns {string | null}
 */
function umamiConfigDiagnostic(config) {
  if (config.status !== "invalid") {
    return null;
  }

  return (
    `Invalid optional analytics variables: ${config.invalidNames.join(", ")}. ` +
    "Analytics is disabled and Flipper continues serving normally."
  );
}

// Tracker script attributes for the Umami embed. Returns null unless the
// configuration is complete and valid, in which case no script is rendered
// and no outbound request is ever made.
//
// The returned attributes enforce the privacy contract on the wire:
// - data-exclude-search / data-exclude-hash keep query strings and hashes
//   (Auth codes, reset tokens) out of tracked URLs.
// - data-do-not-track honors the browser DNT header.
// - data-domains limits tracking to the configured public host.
// No identity attribute (data-distinct-id) is ever present.
/**
 * @param {UmamiConfigValue} config
 * @returns {{ src: string, "data-website-id": string, "data-domains": string,
 *   "data-exclude-search": string, "data-exclude-hash": string,
 *   "data-do-not-track": string } | null}
 */
function getUmamiScriptAttributes(config) {
  if (config.status !== "enabled") {
    return null;
  }

  return {
    src: config.scriptUrl,
    "data-website-id": config.websiteId,
    "data-domains": config.domains,
    "data-exclude-search": "true",
    "data-exclude-hash": "true",
    "data-do-not-track": "true",
  };
}

/**
 * @param {unknown} value
 * @returns {string | number | boolean | null}
 */
function sanitizeAnalyticsValue(value) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") {
    // Objects, arrays, and functions could carry raw payloads; redact them.
    return null;
  }

  const candidate = value.trim();
  if (!candidate || !SAFE_EVENT_VALUE_PATTERN.test(candidate)) {
    return null;
  }
  return candidate;
}

// Builds the only shape of analytics event the product surface may send, or
// returns null when the event must not be tracked at all:
// - the event name must be explicitly defined in ANALYTIC_EVENTS,
// - only the keys listed for that event survive,
// - values are redacted unless they are short, inert tokens.
/**
 * @param {string} name
 * @param {Record<string, unknown>} [data]
 * @returns {{ name: string, data: Record<string, string | number | boolean> } | null}
 */
function buildAnalyticsEvent(name, data = {}) {
  const allowedKeys = ANALYTIC_EVENTS[name];
  if (!allowedKeys) {
    return null;
  }

  const sanitized = {};
  for (const key of allowedKeys) {
    if (!(key in data)) {
      continue;
    }
    const value = sanitizeAnalyticsValue(data[key]);
    if (value !== null) {
      sanitized[key] = value;
    }
  }

  return { name, data: sanitized };
}

module.exports = {
  ANALYTIC_EVENTS,
  UMAMI_SCRIPT_URL_VARIABLE,
  UMAMI_VARIABLES,
  UMAMI_WEBSITE_ID_VARIABLE,
  buildAnalyticsEvent,
  getUmamiConfig,
  getUmamiScriptAttributes,
  sanitizeAnalyticsValue,
  umamiConfigDiagnostic,
};
