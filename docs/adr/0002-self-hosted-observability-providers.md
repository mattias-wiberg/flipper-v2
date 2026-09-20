# Use Umami and SigNoz for Self-Hosted Observability

The web-and-observability plane will use Umami for product analytics and SigNoz through OpenTelemetry for server observability, replacing Vercel Analytics, Vercel Speed Insights, and the first rollout's Sentry alternative. This keeps telemetry under operator control and aligns server tracing with an open instrumentation path, at the cost of operating and recovering separate stateful services.
