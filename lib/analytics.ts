import {
  buildAnalyticsEvent as buildPolicyAnalyticsEvent,
  type AnalyticsEventData,
} from "../analytics-policy.js";

// The policy module owns configuration resolution and attribute shapes; these
// are re-exported directly so there is no pass-through layer to keep in sync.
export {
  getUmamiConfig,
  getUmamiScriptAttributes,
} from "../analytics-policy.js";
export type {
  UmamiConfig,
  UmamiScriptAttributes,
} from "../analytics-policy.js";

// The only tracker surface the product surface may use. `identify` is
// deliberately absent: analytics never attaches authenticated identity.
type UmamiTracker = {
  track: (name: string, data?: AnalyticsEventData) => void;
};

function getUmamiTracker(): UmamiTracker | undefined {
  return (globalThis as { umami?: UmamiTracker }).umami;
}

// Tracks one explicitly defined non-sensitive event (see ANALYTIC_EVENTS in
// analytics-policy.js). When analytics is disabled the tracker script is never
// loaded, so this is a no-op. Event names outside the allowlist are dropped,
// and sensitive values are redacted before send.
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
