import type { ScriptHTMLAttributes } from "react";

import { getUmamiConfig, getUmamiScriptAttributes } from "@/lib/analytics";

// Self-hosted Umami analytics for the production product surface. Rendered
// only when both optional public settings are present and valid (see
// analytics-policy.js). Those settings are build-time inputs: Next.js reads
// them when it prerenders pages, so the build decides whether those pages
// carry the tracker and runtime values must match.
//
// Invalid or partial configuration renders nothing here; build validation
// (scripts/validate-production-env.mjs) warns by variable name only.
// When analytics is disabled nothing is rendered, so the browser never makes
// an outbound analytics request and local development and tests stay silent.
export function Analytics() {
  const attributes = getUmamiScriptAttributes(getUmamiConfig());
  if (!attributes) {
    return null;
  }

  return (
    // Deliberately a plain server-rendered tag rather than next/script, so the
    // privacy attributes stay in the server HTML that docs/umami.md verifies.
    // `defer` matches the documented Umami embed.
    <script
      defer
      {...(attributes as ScriptHTMLAttributes<HTMLScriptElement>)}
    />
  );
}
