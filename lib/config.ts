import type { SiteUrlEnvironment } from "./site-url";

type Environment = SiteUrlEnvironment;

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
