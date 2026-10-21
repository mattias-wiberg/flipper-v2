import {
  buildAnalyticsEvent as buildPolicyAnalyticsEvent,
  getUmamiConfig as getPolicyUmamiConfig,
  getUmamiScriptAttributes as getPolicyUmamiScriptAttributes,
  type AnalyticsEventData,
  type UmamiConfig,
  type UmamiScriptAttributes,
} from "../analytics-policy.js";

export type { UmamiConfig, UmamiScriptAttributes };

export type UmamiEnvironment = Readonly<Record<string, string | undefined>>;

// Resolves the optional analytics configuration. Never throws: absent
// settings disable analytics, and partial or invalid settings disable
// analytics while Flipper keeps serving.
export function getUmamiConfig(
  environment: UmamiEnvironment = process.env,
): UmamiConfig {
  return getPolicyUmamiConfig(environment);
}

// Tracker script attributes (including the privacy attributes that keep
// query strings, hashes, and non-production hosts out of analytics), or null
// when no tracker may load.
export function getUmamiScriptAttributes(
  config: UmamiConfig,
): UmamiScriptAttributes | null {
  return getPolicyUmamiScriptAttributes(config);
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

  const event = buildPolicyAnalyticsEvent(name, data);
  if (!event) {
    return;
  }

  if (Object.keys(event.data).length > 0) {
    tracker.track(event.name, event.data);
  } else {
    tracker.track(event.name);
  }
}
