// Types for the single source of truth in analytics-policy.js.
//
// A sibling declaration file shadows the JavaScript module, so the compiler
// does not compare the two. The policy test asserts that every export declared
// here exists at runtime; keep signatures in sync when the module changes.

export type UmamiConfig =
  | { status: "disabled" }
  | { status: "invalid"; invalidNames: string[] }
  | {
      status: "enabled";
      scriptUrl: string;
      websiteId: string;
      hostname: string;
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

export const ANALYTIC_EVENTS: Readonly<Record<string, readonly string[]>>;

export function buildAnalyticsEvent(
  name: string,
  data?: Readonly<Record<string, unknown>>,
): AnalyticsEvent | null;
export function getUmamiConfig(
  environment?: Record<string, string | undefined>,
): UmamiConfig;
export function getUmamiScriptAttributes(
  config: UmamiConfig,
): UmamiScriptAttributes | null;
export function sanitizeAnalyticsValue(
  value: unknown,
): string | number | boolean | null;
export function umamiConfigDiagnostic(config: UmamiConfig): string | null;
