import { getUmamiConfig, getUmamiScriptAttributes } from "@/lib/analytics";

// Self-hosted Umami analytics for the production product surface. Rendered
// only when both optional public settings are present and valid (see
// analytics-policy.js). Those settings are build-time inputs: Next.js inlines
// them into statically prerendered pages, so the build decides whether those
// pages carry the tracker and runtime values must match.
//
// Invalid or partial configuration renders nothing here; the build gate
// (scripts/validate-production-env.mjs) reports it by variable name only.
// When analytics is disabled nothing is rendered, so the browser never makes
// an outbound analytics request and local development and tests stay silent.
export function Analytics() {
  const attributes = getUmamiScriptAttributes(getUmamiConfig());
  if (!attributes) {
    return null;
  }

  return (
    <script
      defer
      src={attributes.src}
      data-website-id={attributes["data-website-id"]}
      data-domains={attributes["data-domains"]}
      data-exclude-search={attributes["data-exclude-search"]}
      data-exclude-hash={attributes["data-exclude-hash"]}
      data-do-not-track={attributes["data-do-not-track"]}
    />
  );
}
