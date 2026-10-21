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
// configured public host so development and test origins never send page-view
// or event beacons. (The tracker script itself is only rendered when both
// settings are present, so the default development and test setup loads no
// analytics script at all.)
//
// The two settings are build-time inputs: Next.js reads public values when it
// prerenders pages, so the build inputs decide whether those pages carry the
// tracker. Runtime values must match the build inputs; changing only the
// runtime environment cannot remove a tracker that was baked in at build.
const siteUrlPolicy = require("./site-url-policy.js");

const UMAMI_SCRIPT_URL_VARIABLE = "NEXT_PUBLIC_UMAMI_SCRIPT_URL";
const UMAMI_WEBSITE_ID_VARIABLE = "NEXT_PUBLIC_UMAMI_WEBSITE_ID";
const UMAMI_VARIABLES = [UMAMI_SCRIPT_URL_VARIABLE, UMAMI_WEBSITE_ID_VARIABLE];

// Beacons are only sent from the configured public host (never localhost or a
// deployment preview), matching the single source of truth for the origin.
const UMAMI_TRACKING_HOSTNAME = new URL(siteUrlPolicy.CANONICAL_SITE_URL)
  .hostname;

// Explicitly defined non-sensitive analytics events. Each event maps every
// data key it may carry to that key's fixed vocabulary; a value outside the
// vocabulary is dropped. An event that is not listed here is never tracked,
// and a key without a declared vocabulary cannot carry data at all.
const ANALYTIC_EVENTS = {
  theme_change: { theme: ["light", "dark", "system"] },
};

// Emails, URLs, keys, tokens, and passwords are absent from every declared
// vocabulary, so they can never be sent even when they are short strings.
const WEBSITE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The tracker script must be served over HTTPS from a bare script URL: an
// http:// script would be blocked as mixed content on the HTTPS product
// surface, and query strings or hashes in the script URL are never needed.
function normalizeScriptUrl(value) {
  const parsed = siteUrlPolicy.parseHttpUrl(value);
  if (!parsed || parsed.protocol !== "https:" || parsed.search || parsed.hash) {
    return null;
  }
  return parsed.toString();
}

function normalizeWebsiteId(value) {
  const candidate = value?.trim();
  return candidate && WEBSITE_ID_PATTERN.test(candidate) ? candidate : null;
}

/**
 * @typedef {{ status: "disabled" } |
 *   { status: "invalid", invalidNames: string[] } |
 *   { status: "enabled", scriptUrl: string, websiteId: string, hostname: string }} UmamiConfigValue
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
    hostname: UMAMI_TRACKING_HOSTNAME,
  };
}

// Name-only diagnostic for incomplete or invalid analytics configuration. The
// message is safe to log and retain; it never contains a configured value.
/**
 * @param {UmamiConfigValue} config
 * @returns {string | null}
 */
function umamiConfigDiagnostic(config) {
  if (config.status !== "invalid") {
    return null;
  }

  return (
    `Incomplete or invalid optional analytics variables: ${config.invalidNames.join(", ")}. ` +
    "The optional analytics settings are not applied and Flipper continues serving normally."
  );
}

// Tracker script attributes for the Umami embed. Returns null unless the
// configuration is complete and valid; with null, no script is rendered and
// no analytics beacon is sent.
//
// The returned attributes enforce the privacy contract on the wire:
// - data-exclude-search / data-exclude-hash keep query strings and hashes
//   (Auth codes, reset tokens) out of tracked URLs.
// - data-do-not-track honors the browser DNT header.
// - data-domains limits beacons to the configured public host.
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
    "data-domains": config.hostname,
    "data-exclude-search": "true",
    "data-exclude-hash": "true",
    "data-do-not-track": "true",
  };
}

// Builds the only shape of analytics event the product surface may send, or
// returns null when the event must not be tracked at all:
// - the event name must be explicitly defined in ANALYTIC_EVENTS,
// - only declared keys survive,
// - values must belong to the key's declared vocabulary.
/**
 * @param {string} name
 * @param {Record<string, unknown>} [data]
 * @returns {{ name: string, data: Record<string, string> } | null}
 */
function buildAnalyticsEvent(name, data = {}) {
  // Object.hasOwn-style check: an inherited name such as "constructor" or
  // "toString" must never be treated as an allowlisted event.
  if (!Object.prototype.hasOwnProperty.call(ANALYTIC_EVENTS, name)) {
    return null;
  }
  const eventVocabulary = ANALYTIC_EVENTS[name];

  const sanitized = {};
  for (const key of Object.keys(eventVocabulary)) {
    if (!(key in data)) {
      continue;
    }
    if (!eventVocabulary[key].includes(data[key])) {
      continue;
    }
    sanitized[key] = data[key];
  }

  return { name, data: sanitized };
}

module.exports = {
  ANALYTIC_EVENTS,
  buildAnalyticsEvent,
  getUmamiConfig,
  getUmamiScriptAttributes,
  umamiConfigDiagnostic,
};
