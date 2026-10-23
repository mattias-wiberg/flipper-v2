# Use Umami and SigNoz for Self-Hosted Observability

The web-and-observability plane will use Umami for product analytics and SigNoz through OpenTelemetry for server observability, replacing Vercel Analytics, Vercel Speed Insights, and the first rollout's Sentry alternative. This keeps telemetry under operator control and aligns server tracing with an open instrumentation path, at the cost of operating and recovering separate stateful services.

## Status and scope (2026-10-21)

This decision stands for the providers, but its scope in this rollout is
Umami-only. The operator deferred #61 (SigNoz/OpenTelemetry) out of this rollout
on 2026-10-21, recorded on #23. No SigNoz service, collector, or server
telemetry is deployed, and the released observability plane is Umami alone.
SigNoz and OpenTelemetry remain the intended server-observability path when that
work is scheduled; this note narrows scope without withdrawing the decision.
