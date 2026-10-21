// Release-gate configuration contract.
//
// Every value comes from the process environment; nothing is read from a file
// and no secret is ever written by the gate. Parsing is pure so the gating
// rules (what runs, what skips, what rejects) are covered by unit tests without
// touching the network or any provider.
const siteUrlPolicy = require("../../site-url-policy.js");

const { CANONICAL_SITE_URL, parseSiteUrl } = siteUrlPolicy;

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

const DEFAULT_REPORT_PATH = "release-gate-report.json";

function isEnabled(value) {
  return ["1", "true", "yes"].includes(
    String(value ?? "")
      .trim()
      .toLowerCase(),
  );
}

function read(env, name) {
  const value = env[name];
  return typeof value === "string" ? value.trim() : "";
}

// A group is usable only when every variable it needs is present. A partially
// configured group is reported by variable name and skipped, never guessed.
function readGroup(env, names) {
  const missing = names.filter((name) => !read(env, name));
  if (missing.length === 0) {
    return {
      missing,
      values: Object.fromEntries(names.map((name) => [name, read(env, name)])),
    };
  }
  return { missing, values: null };
}

function parseOrigin(name, value, errors) {
  const url = parseSiteUrl(value);
  if (!url) {
    errors.push({
      variable: name,
      message: `${name} must be an http(s) origin without credentials, path, query, or hash`,
    });
    return null;
  }
  return url.origin;
}

function parseBaseUrl(value, errors) {
  const origin = parseOrigin("RELEASE_BASE_URL", value, errors);
  if (!origin) {
    return null;
  }
  const url = new URL(origin);
  if (url.protocol !== "https:" && !LOCAL_HOSTNAMES.has(url.hostname)) {
    errors.push({
      variable: "RELEASE_BASE_URL",
      message:
        "RELEASE_BASE_URL must use https; http is only accepted for a local container",
    });
    return null;
  }
  return origin;
}

function missingSentence(missing) {
  return `${missing.join(" / ")} ${missing.length === 1 ? "is" : "are"} not set`;
}

/**
 * @returns {{
 *   baseUrl: string | null,
 *   expectedSiteUrl: string,
 *   auth: { email: string, password: string } | null,
 *   ingestion: { token: string } | null,
 *   supabase: { url: string, serviceRoleKey: string } | null,
 *   umami: { url: string, username: string, password: string, websiteId: string } | null,
 *   local: { enabled: boolean, install: boolean },
 *   container: boolean,
 *   reportPath: string,
 *   errors: Array<{ variable: string, message: string }>,
 *   notes: string[],
 *   secrets: string[],
 * }}
 */
function parseGateConfig(env = process.env) {
  const errors = [];
  const notes = [];
  const secrets = [];

  const baseUrlValue = read(env, "RELEASE_BASE_URL");
  const baseUrl = baseUrlValue ? parseBaseUrl(baseUrlValue, errors) : null;
  if (!baseUrlValue) {
    notes.push(
      `RELEASE_BASE_URL is not set: deployed checks are skipped. Set it to the origin under test, for example ${CANONICAL_SITE_URL}.`,
    );
  }

  const authGroup = readGroup(env, ["SMOKE_EMAIL", "SMOKE_PASSWORD"]);
  let auth = null;
  if (authGroup.values) {
    auth = {
      email: authGroup.values.SMOKE_EMAIL,
      password: authGroup.values.SMOKE_PASSWORD,
    };
    secrets.push(auth.password);
  } else if (authGroup.missing.length < 2) {
    notes.push(
      `${authGroup.missing.join(" / ")} is missing: SMOKE_EMAIL and SMOKE_PASSWORD must be set together, so Auth checks are skipped.`,
    );
  } else {
    notes.push(
      "SMOKE_EMAIL / SMOKE_PASSWORD are not set: Auth checks are skipped (email delivery stays operator-gated either way).",
    );
  }

  const ingestionGroup = readGroup(env, ["SMOKE_INGESTION_TOKEN"]);
  let ingestion = null;
  if (ingestionGroup.values) {
    ingestion = { token: ingestionGroup.values.SMOKE_INGESTION_TOKEN };
    secrets.push(ingestion.token);
  } else {
    notes.push(
      "SMOKE_INGESTION_TOKEN is not set: ingestion checks are skipped.",
    );
  }

  const supabaseGroup = readGroup(env, [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]);
  let supabase = null;
  if (supabaseGroup.values) {
    const url = parseOrigin(
      "NEXT_PUBLIC_SUPABASE_URL",
      supabaseGroup.values.NEXT_PUBLIC_SUPABASE_URL,
      errors,
    );
    if (url) {
      supabase = {
        url,
        serviceRoleKey: supabaseGroup.values.SUPABASE_SERVICE_ROLE_KEY,
      };
      secrets.push(supabase.serviceRoleKey);
    }
  } else {
    notes.push(
      `${missingSentence(supabaseGroup.missing)}: persisted-order and golden-replay checks are skipped.`,
    );
  }

  const umamiGroup = readGroup(env, [
    "UMAMI_URL",
    "UMAMI_USERNAME",
    "UMAMI_PASSWORD",
    "UMAMI_WEBSITE_ID",
  ]);
  let umami = null;
  if (umamiGroup.values) {
    const url = parseOrigin("UMAMI_URL", umamiGroup.values.UMAMI_URL, errors);
    if (url) {
      umami = {
        url,
        username: umamiGroup.values.UMAMI_USERNAME,
        password: umamiGroup.values.UMAMI_PASSWORD,
        websiteId: umamiGroup.values.UMAMI_WEBSITE_ID,
      };
      secrets.push(umami.password);
    }
  } else {
    notes.push(
      `${missingSentence(umamiGroup.missing)}: Umami page-view and privacy checks are skipped.`,
    );
  }

  return {
    baseUrl,
    expectedSiteUrl: CANONICAL_SITE_URL,
    auth,
    ingestion,
    supabase,
    umami,
    local: {
      enabled: isEnabled(env.RELEASE_GATE_LOCAL),
      install: isEnabled(env.RELEASE_GATE_INSTALL),
    },
    container: isEnabled(env.RELEASE_GATE_CONTAINER),
    reportPath: read(env, "RELEASE_GATE_REPORT") || DEFAULT_REPORT_PATH,
    errors,
    notes,
    secrets: secrets.filter(Boolean),
  };
}

module.exports = {
  CANONICAL_SITE_URL,
  parseGateConfig,
};
