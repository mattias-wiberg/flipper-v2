import { readFileSync } from "node:fs";
import path from "node:path";

const { canonicalSiteUrl } = JSON.parse(
  readFileSync(path.join(process.cwd(), "site-url.config.json"), "utf8"),
);
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

function isOrigin(value) {
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

if (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() &&
  (!isOrigin(process.env.NEXT_PUBLIC_SITE_URL) ||
    new URL(process.env.NEXT_PUBLIC_SITE_URL).origin !== canonicalSiteUrl)
) {
  invalid.push("NEXT_PUBLIC_SITE_URL");
}

if (
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
  !isOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL)
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
