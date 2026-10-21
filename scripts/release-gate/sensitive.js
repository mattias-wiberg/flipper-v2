// Sensitive-value detection for release-gate evidence and analytics payloads.
//
// Two jobs, both pure and testable without network access:
// - Redact known secret values from any text the gate prints or records.
// - Detect leaks (emails, tokens, cookies, credentials, URLs carrying secrets)
//   in values the deployed product emits, and reject unexpected beacon fields.
//
// Findings identify the path and the rule only, never the matched value, so the
// evidence report can always be retained and shared.
const analyticsPolicy = require("../../analytics-policy.js");

const { ANALYTIC_EVENTS } = analyticsPolicy;

// Value shapes that must never appear in product analytics or gate output.
// Deliberately shape-based: the words "password" or "token" can legitimately
// appear in page titles, so only secret-like values are reported.
const SENSITIVE_RULES = [
  {
    id: "email",
    pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/,
  },
  {
    id: "jwt",
    pattern: /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/,
  },
  {
    id: "bearer-token",
    pattern: /bearer\s+[A-Za-z0-9._~+/=-]{12,}/i,
  },
  {
    id: "auth-cookie",
    pattern: /(?:^|\W)sb-[A-Za-z0-9_-]+-auth-token(?:\.[0-9]+)?(?:$|\W)/,
  },
  {
    id: "credential-query",
    pattern:
      /[?&#](?:token|code|access_token|refresh_token|apikey|api_key|key|password)=/i,
  },
  {
    id: "password-field",
    pattern: /"password"\s*:/i,
  },
  {
    id: "long-hex-secret",
    pattern: /(?:^|[^0-9a-z])[0-9a-f]{40,}(?:[^0-9a-z]|$)/i,
  },
];

// Umami's tracker beacon (v3.4): the only fields the product may send. A page
// view carries the page context; events add an allowlisted name plus their
// fixed vocabulary, and performance beacons add measurement numbers. The
// tracker only sends `id` when identity tracking is enabled, which the policy
// forbids.
const BEACON_ENVELOPE_FIELDS = new Set(["type", "payload"]);
const BEACON_PAYLOAD_FIELDS = new Set([
  "website",
  "hostname",
  "url",
  "referrer",
  "title",
  "language",
  "screen",
  "tag",
  "name",
  "event",
  "data",
  "ttfb",
  "fcp",
  "lcp",
  "cls",
  "inp",
  "duration",
]);
const BEACON_DATA_FIELDS = new Set(
  Object.values(ANALYTIC_EVENTS).flatMap((vocabulary) =>
    Object.keys(vocabulary),
  ),
);
const IDENTITY_FIELDS = new Set([
  "id",
  "distinctid",
  "distinct_id",
  "sessionid",
  "session_id",
  "userid",
  "user_id",
  "email",
]);

function matchesSensitiveRule(value) {
  return SENSITIVE_RULES.filter(({ pattern }) => pattern.test(value)).map(
    ({ id }) => id,
  );
}

/**
 * Walk a JSON-like value and report every string that looks sensitive.
 * Returns `[{ path, rule }]`; never includes the value itself.
 */
function findSensitiveValues(value, { path = "", findings = [] } = {}) {
  if (typeof value === "string") {
    for (const rule of matchesSensitiveRule(value)) {
      findings.push({ path: path || "$", rule });
    }
    return findings;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      findSensitiveValues(entry, { path: `${path}[${index}]`, findings }),
    );
    return findings;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      findSensitiveValues(entry, {
        path: path ? `${path}.${key}` : key,
        findings,
      });
    }
  }
  return findings;
}

/**
 * Inspect one Umami beacon payload captured from the deployed site.
 * Returns `[{ path, rule }]` for leaks and for fields the policy forbids.
 */
function scanBeaconPayload(beacon) {
  const findings = [];
  const report = (path, rule) => findings.push({ path, rule });

  if (!beacon || typeof beacon !== "object") {
    report("$", "not-an-object");
    return findings;
  }

  for (const key of Object.keys(beacon)) {
    if (!BEACON_ENVELOPE_FIELDS.has(key)) {
      report(key, "unexpected-field");
    }
  }

  const payload = beacon.payload;
  if (!payload || typeof payload !== "object") {
    report("payload", "missing-payload");
    return findings;
  }

  for (const key of Object.keys(payload)) {
    if (BEACON_PAYLOAD_FIELDS.has(key)) {
      continue;
    }
    report(`payload.${key}`, "unexpected-field");
  }

  if (payload.data && typeof payload.data === "object") {
    for (const key of Object.keys(payload.data)) {
      if (!BEACON_DATA_FIELDS.has(key)) {
        report(`payload.data.${key}`, "unexpected-event-field");
      }
    }
  }

  const walkIdentity = (value, path) => {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => walkIdentity(entry, `${path}[${index}]`));
      return;
    }
    if (!value || typeof value !== "object") {
      return;
    }
    for (const [key, entry] of Object.entries(value)) {
      if (IDENTITY_FIELDS.has(key.toLowerCase())) {
        report(`${path}.${key}`, "identity-field");
      }
      walkIdentity(entry, `${path}.${key}`);
    }
  };
  walkIdentity(beacon, "payload");

  findings.push(...findSensitiveValues(beacon, { path: "payload" }));
  return findings;
}

/**
 * Remove query strings and hashes from absolute URLs in a diagnostic. The gate
 * records paths and origins, never the parameters that can carry Auth codes or
 * reset tokens.
 */
function stripUrlSecrets(text) {
  return String(text).replace(
    /https?:\/\/[^\s"'<>]+/gi,
    (match) => match.split(/[?#]/)[0],
  );
}

/**
 * Replace known secret values (and their URL-encoded forms) in text.
 * Short values are skipped so common words cannot be mangled.
 */
function redactSecrets(text, secretValues = []) {
  let output = String(text);
  for (const value of secretValues) {
    if (typeof value !== "string" || value.length < 4) {
      continue;
    }
    for (const form of [value, encodeURIComponent(value)]) {
      output = output.split(form).join("[redacted]");
    }
  }
  return output;
}

module.exports = {
  findSensitiveValues,
  redactSecrets,
  scanBeaconPayload,
  stripUrlSecrets,
};
