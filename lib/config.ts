import {
  CANONICAL_SITE_URL,
  normalizeSiteUrl,
  type SiteUrlEnvironment,
} from "./site-url";

export { CANONICAL_SITE_URL } from "./site-url";

export const PRODUCTION_PUBLIC_ENV_VARS = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

export const PRODUCTION_SERVER_ENV_VARS = [
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

type Environment = SiteUrlEnvironment;

const forbiddenPublicSecretPattern =
  /SERVICE_ROLE|SECRET|TOKEN|PASSWORD|OTLP|MONITOR|SENTRY/i;

export function getMissingProductionEnvironmentVariables(
  environment: Environment = process.env,
) {
  return [...PRODUCTION_PUBLIC_ENV_VARS, ...PRODUCTION_SERVER_ENV_VARS].filter(
    (name) => !environment[name]?.trim(),
  );
}

export function getInvalidProductionEnvironmentVariables(
  environment: Environment = process.env,
) {
  const invalid: string[] = [];
  const configuredSiteUrl = environment.NEXT_PUBLIC_SITE_URL;
  const supabaseUrl = environment.NEXT_PUBLIC_SUPABASE_URL;

  if (
    configuredSiteUrl?.trim() &&
    normalizeSiteUrl(configuredSiteUrl) !== CANONICAL_SITE_URL
  ) {
    invalid.push("NEXT_PUBLIC_SITE_URL");
  }

  if (supabaseUrl?.trim() && !normalizeSiteUrl(supabaseUrl)) {
    invalid.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  for (const name of Object.keys(environment)) {
    if (
      name.startsWith("NEXT_PUBLIC_") &&
      forbiddenPublicSecretPattern.test(name)
    ) {
      invalid.push(name);
    }
  }

  return [...new Set(invalid)];
}

export function assertProductionEnvironment(
  environment: Environment = process.env,
) {
  const missing = getMissingProductionEnvironmentVariables(environment);
  const invalid = getInvalidProductionEnvironmentVariables(environment);
  const diagnostics: string[] = [];

  if (missing.length > 0) {
    diagnostics.push(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  if (invalid.length > 0) {
    diagnostics.push(`Invalid environment variables: ${invalid.join(", ")}`);
  }

  if (diagnostics.length > 0) {
    throw new Error(diagnostics.join("\n"));
  }
}

export function getServerSupabaseConfig(
  environment: Environment = process.env,
) {
  const names = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ] as const;
  const missing = names.filter((name) => !environment[name]?.trim());

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  return {
    url: environment.NEXT_PUBLIC_SUPABASE_URL as string,
    serviceRoleKey: environment.SUPABASE_SERVICE_ROLE_KEY as string,
  };
}
