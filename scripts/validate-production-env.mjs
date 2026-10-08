import analyticsPolicy from "../analytics-policy.js";
import siteUrlPolicy from "../site-url-policy.js";

const { getUmamiConfig, umamiConfigDiagnostic } = analyticsPolicy;
const { CANONICAL_SITE_URL, normalizeSiteUrl } = siteUrlPolicy;
const publicVariables = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];
const runtimeVariables = ["SUPABASE_SERVICE_ROLE_KEY"];
const forbiddenPublicSecretPattern =
  /SERVICE_ROLE|SECRET|TOKEN|PASSWORD|OTLP|MONITOR|SENTRY/i;
const buildOnly = process.argv.includes("--build");
const requiredVariables = buildOnly
  ? publicVariables
  : [...publicVariables, ...runtimeVariables];

const missing = requiredVariables.filter((name) => !process.env[name]?.trim());
const invalid = [];

if (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() &&
  normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) !== CANONICAL_SITE_URL
) {
  invalid.push("NEXT_PUBLIC_SITE_URL");
}

if (
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
  !normalizeSiteUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
) {
  invalid.push("NEXT_PUBLIC_SUPABASE_URL");
}

for (const name of Object.keys(process.env)) {
  if (
    name.startsWith("NEXT_PUBLIC_") &&
    forbiddenPublicSecretPattern.test(name)
  ) {
    invalid.push(name);
  }
}

const diagnostics = [];
if (missing.length > 0) {
  diagnostics.push(
    `Missing required environment variables: ${missing.join(", ")}`,
  );
}
if (invalid.length > 0) {
  diagnostics.push(
    `Invalid environment variables: ${[...new Set(invalid)].join(", ")}`,
  );
}

if (diagnostics.length > 0) {
  console.error(diagnostics.join("\n"));
  process.exit(1);
}

// Optional analytics configuration never fails the gate: absent settings
// disable analytics, and a partial or invalid Umami configuration disables
// analytics while Flipper keeps serving public pages, Auth, and ingestion.
// The warning names environment variables only; it is safe to log and retain.
const analyticsDiagnostic = umamiConfigDiagnostic(getUmamiConfig(process.env));
if (analyticsDiagnostic) {
  console.warn(analyticsDiagnostic);
}
