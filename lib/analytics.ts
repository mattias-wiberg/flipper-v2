import {
  ANALYTIC_EVENTS,
  buildAnalyticsEvent as buildPolicyAnalyticsEvent,
  getUmamiConfig as getPolicyUmamiConfig,
  getUmamiScriptAttributes as getPolicyUmamiScriptAttributes,
  sanitizeAnalyticsValue as sanitizePolicyAnalyticsValue,
  umamiConfigDiagnostic as getPolicyUmamiDiagnostic,
} from "../analytics-policy.js";

export { ANALYTIC_EVENTS };

export type UmamiEnvironment = Readonly<Record<string, string | undefined>>;

export type UmamiConfig =
  | { status: "disabled" }
  | { status: "invalid"; invalidNames: string[] }
  | {
      status: "enabled";
      scriptUrl: string;
      websiteId: string;
      domains: string;
    };

export type UmamiScriptAttributes = Readonly<{
  src: string;
  "data-website-id": string;
  "data-domains": string;
  "data-exclude-search": string;
  "data-exclude-hash": string;
  "data-do-not-track": string;
}>;

export type AnalyticsEventData = Readonly<
  Record<string, string | number | boolean>
>;

export type AnalyticsEvent = Readonly<{
  name: string;
  data: AnalyticsEventData;
}>;

// Resolves the optional analytics configuration. Never throws: absent
// settings disable analytics, and partial or invalid settings disable
// analytics with a name-only diagnostic while Flipper keeps serving.
export function getUmamiConfig(
  environment: UmamiEnvironment = process.env,
): UmamiConfig {
  return getPolicyUmamiConfig(environment);
}

// Name-only diagnostic for invalid analytics configuration, or null. Safe to
// log and retain; it never contains a configured value.
export function umamiConfigDiagnostic(config: UmamiConfig): string | null {
  return getPolicyUmamiDiagnostic(config);
}

// Tracker script attributes (including the privacy attributes that keep
// query strings, hashes, and non-production hosts out of analytics), or null
// when no tracker may load and no outbound request may be made.
export function getUmamiScriptAttributes(
  config: UmamiConfig,
): UmamiScriptAttributes | null {
  return getPolicyUmamiScriptAttributes(config);
}

// Redacts a candidate event value unless it is a short, inert token. Emails,
// URLs, keys, tokens, passwords, and raw payload shapes are redacted.
export function sanitizeAnalyticsValue(
  value: unknown,
): string | number | boolean | null {
  return sanitizePolicyAnalyticsValue(value);
}

// Builds the only shape of analytics event the product surface may send, or
// returns null when the event must not be tracked at all (event names outside
// the explicit allowlist, or nothing left after redaction of the data).
export function buildAnalyticsEvent(
  name: string,
  data: Readonly<Record<string, unknown>> = {},
): AnalyticsEvent | null {
  return buildPolicyAnalyticsEvent(name, data);
}

// The only tracker surface the product surface may use. `identify` is
// deliberately absent: analytics never attaches authenticated identity.
type UmamiTracker = {
  track: (name: string, data?: AnalyticsEventData) => void;
};

function getUmamiTracker(): UmamiTracker | undefined {
  return (globalThis as { umami?: UmamiTracker }).umami;
}

// Tracks one explicitly defined non-sensitive event (see ANALYTIC_EVENTS).
// When analytics is disabled the tracker script is never loaded, so this
// becomes a no-op and no outbound request is ever made. Event names outside
// the allowlist are dropped, and sensitive values are redacted before send.
export function trackAnalyticsEvent(
  name: string,
  data: Readonly<Record<string, unknown>> = {},
): void {
  const tracker = getUmamiTracker();
  if (!tracker || typeof tracker.track !== "function") {
    return;
  }

  const event = buildAnalyticsEvent(name, data);
  if (!event) {
    return;
  }

  if (Object.keys(event.data).length > 0) {
    tracker.track(event.name, event.data);
  } else {
    tracker.track(event.name);
  }
}
