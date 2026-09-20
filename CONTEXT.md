# Flipper Operations Context

This context defines the language for operating Flipper's production web service and its supporting observability services. The existing Supabase project remains an external authoritative dependency for this rollout.

## Language

**Flipper**:
The web service for Albion Online market-order ingestion and authenticated deal discovery.

**Web-and-observability plane**:
The operator-managed production services that run Flipper and collect product analytics and operational telemetry. It excludes the external Supabase project.
_Avoid_: self-hosted Flipper, when referring to the plane rather than the web service alone

**Release**:
A versioned, deployable revision of the Flipper web service.

**Deployment**:
Making a release available in the production environment.

**Known-good release**:
A release that has passed the required production workflow and operational checks.

**Rollback**:
Restoring the previous known-good release after a deployment fails or causes unacceptable behavior.

**Production-ready**:
The state in which the required deployment, workflow, observability, persistence, and recovery checks have passed. A successful build alone is not production-ready.

**Health**:
The web service's ability to return a stable unauthenticated process response without requiring Supabase, Auth, market-order data, or observability services.
_Avoid_: dependency readiness, when referring to this process-level contract

**Ingestion**:
Receiving, validating, normalizing, and persisting market-order data submitted by the Albion Data Client.
_Avoid_: import, sync, when referring to the market-order endpoint

**Development recorder**:
A local-only facility that captures raw market-order requests for development and replay. It is not part of production ingestion.

**Observability**:
The product analytics, traces, and error information used to understand how Flipper behaves in production.

**Operator surface**:
A dashboard or endpoint intended for operators and protected from ordinary public users.

**Restore rehearsal**:
A deliberate recovery exercise that restores representative observability data and verifies that it is usable.

**Deployment smoke test**:
An environment-gated black-box check of a deployed Flipper release, including its public, Auth, and ingestion behavior.

**Release gate**:
A required check whose evidence must pass before a release can become a known-good release.

**Operator checklist**:
The infrastructure and provider checks that require access to the production environment and cannot be proven by repository tests alone.

**Public origin**:
The canonical HTTPS address through which users reach Flipper and to which user-facing links and Auth callback destinations return.

**Auth callback**:
The route that exchanges a Supabase authorization code for a session and returns the user to a safe local destination within Flipper.
_Avoid_: open redirect, when referring to this constrained Auth flow

**Operator**:
The person responsible for deploying, monitoring, backing up, restoring, and rolling back the web-and-observability plane.

**Supabase project**:
The existing authoritative service for Flipper authentication, tokens, orders, row-level access, and scheduled cleanup in this rollout.
_Avoid_: self-hosted database, when referring to the first rollout's data and Auth service
