# Self-Host the Web and Observability Plane First

The first self-hosting release will operate Flipper's web-and-observability plane under Dokploy while the existing Supabase project remains authoritative for Auth, tokens, orders, row-level access, and cleanup. We choose this boundary over migrating Supabase at the same time to limit migration and rollback risk; Supabase self-hosting is a separate future migration.
