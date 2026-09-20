---
name: dokploy-cli
description: "Use whenever the user mentions Dokploy, the Dokploy panel, or asks to deploy or manage this project through Dokploy. Use the repository-local Dokploy CLI for homelab operations, including applications, Compose stacks, databases, domains, deployments, and server administration."
metadata:
  author: flipper-v2
  version: "0.1.0"
---

# Dokploy CLI

Use the repository-local CLI. The dependency and lockfile are the source of truth; do not install or use a global copy.

```powershell
npx --no-install dokploy <group> <action> [options]
```

The configured panel is `https://dokploy.mattiaswiberg.com`. Pass the base URL without `/api` when authenticating or configuring the CLI.

## Authentication

Use the existing stored local credentials when available. Otherwise use `DOKPLOY_URL` with `DOKPLOY_API_KEY` (or `DOKPLOY_AUTH_TOKEN`) in the shell environment or the working directory's ignored `.env` file. The CLI does not load `.env.local`.

Check authentication with a read-only command:

```powershell
npx --no-install dokploy user get
```

If authentication fails, ask the user to authenticate locally. Keep API keys out of chat, source files, command examples, logs, and skill files.

## Command Workflow

1. Discover the current command shape before acting. Use `npx --no-install dokploy --help`, then the relevant group and action `--help`. The command set is generated from Dokploy's OpenAPI spec and changes over time.
2. Inspect before acting. Use list, get, search, or status commands to identify the exact resource and IDs. Do not guess IDs or flags.
3. Use `--json` when output will be parsed or fed into another command. Treat returned environment values, credentials, tokens, and database secrets as sensitive; show only what the user needs.
4. For deploy, redeploy, restart, stop, rollback, delete, remove, cleanup, drop, password-reset, or access-control operations, identify the exact target and intended effect, then get user confirmation before running the command unless the current request already clearly confirms that exact operation and target.
5. After a mutation, query the relevant resource or deployment status again and report the observed result. A command that exits successfully is not proof that the desired state has been reached.

Prefer the official CLI over hand-written requests to Dokploy's `/api` endpoints. If the CLI lacks a needed operation, explain that limitation before using a raw API call.

Official CLI repository: https://github.com/Dokploy/cli
