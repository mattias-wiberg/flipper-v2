// Types for the single source of truth in analytics-policy.js. Keeping them
// here means the runtime contract and its TypeScript surface cannot drift.

export type UmamiEnvironment = Readonly<Record<string, string | undefined>>;

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
export const UMAMI_SCRIPT_URL_VARIABLE: string;
export const UMAMI_VARIABLES: readonly string[];
export const UMAMI_WEBSITE_ID_VARIABLE: string;

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
