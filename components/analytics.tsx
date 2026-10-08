import {
  getUmamiConfig,
  getUmamiScriptAttributes,
  umamiConfigDiagnostic,
} from "@/lib/analytics";

// Warn once per process so an invalid optional analytics configuration is
// visible in server logs without repeating on every request. The diagnostic
// names environment variables only and never includes configured values.
let diagnosticsWarned = false;

// Self-hosted Umami analytics for the production product surface. Rendered
// only when both optional public settings are present and valid (see
// analytics-policy.js). The plain deferred script is the documented Umami
// embed; it keeps the privacy attributes server-rendered and auditable, and
// matches the layout's existing inline-script precedent. When analytics is
// disabled nothing is rendered, so the browser never makes an outbound
// request and local development and tests stay silent.
export function Analytics() {
  const config = getUmamiConfig();
  const diagnostic = umamiConfigDiagnostic(config);
  if (diagnostic && !diagnosticsWarned) {
    diagnosticsWarned = true;
    console.warn(diagnostic);
  }

  const attributes = getUmamiScriptAttributes(config);
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
