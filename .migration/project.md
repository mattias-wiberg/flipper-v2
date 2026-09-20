# project

2026-09-20, post-migration compatibility sweep, completed the Base UI consumer audit and exact Zod/Recharts/Supabase dependency updates; the reachable application remains on the Base UI `base-nova` model.

## Changed

- `components/ui/aspect-ratio.tsx`, `breadcrumb.tsx`, `context-menu.tsx`, `hover-card.tsx`, `menubar.tsx`, `navigation-menu.tsx`, `progress.tsx`, `radio-group.tsx`, `scroll-area.tsx`, `slider.tsx`, `switch.tsx`, `toggle.tsx`, and `toggle-group.tsx`: deleted. None had an application or shared-wrapper consumer, so replacing them would add unreferenced API surface without changing the shipped product.
- `components/typography/inline-code.tsx`: changed its unused illustrative package-name text from a Radix package to the Base UI equivalent.
- `package.json` and `package-lock.json`: removed the direct Radix UI packages and their now-unreachable transitive packages, pinned direct Supabase packages to exact versions, and upgraded `zod` to `4.6.5` and `recharts` to `3.10.1`. `@base-ui/react` remains a direct dependency; the remaining Radix lock entries are reachable only through the intentionally retained `cmdk` and `vaul` packages.
- `components.json`: already had the validated `base-nova` configuration and required no change.
- Final source and manifest scans contain no Radix imports or direct Radix dependencies. The retained primitive wrappers use Base UI; `cmdk`, `vaul`, `sonner`, `input-otp`, `react-day-picker`, `recharts`, and `react-resizable-panels` remain on their intended libraries.
- `utils/auth.ts` and `utils/items.ts`: adapted Zod 4 error/schema seams; `lib/orderSchemas.test.ts` adds focused parsing coverage without changing domain formulas or persisted fixtures.
- `components/ui/chart.tsx`: updated the custom tooltip and legend prop types for Recharts 3.
- `components/ui/account-menu.tsx`: deleted after confirming it had no consumers.
- `app/authenticated/deals/components/*`, `components/user-nav.tsx`, `components/theme-switcher.tsx`, and shared icon wrappers: grouped Base UI collections, applied `data-icon` to text-button icons, removed manual child icon sizing, and retained existing actions.
- Auth success messages now use semantic primary tokens instead of raw green color classes.

## Left alone

- Existing Base UI wrappers and their consumers were not rewritten because the prior tickets already migrated the reachable surfaces.
- The non-Radix wrappers and direct dependencies listed above were intentionally not replaced.
- `mocker/data/marketorders.expected.json`, database/schema/RLS files, authentication/domain behavior, and deal rules were intentionally not changed.
- Existing per-component reports remain the detailed record for the earlier migrations.
- The pre-upgrade golden replay was run from commit `4cd2a69` in an isolated worktree: 5,131 batches sent with 0 failures, 220,124 orders exported, and the expected SHA-256 matched (`6775375bd98d636d5fd89b2d40540193f3e1391ce32d64f213c4e86b186b326e`).

## Verification

- `npx shadcn@latest info --json`: passed; reports `base-nova`, `base: base`, Tailwind v4, and the expected aliases.
- `npx shadcn@latest docs button checkbox collapsible dialog dropdown-menu popover select tabs tooltip sidebar accordion alert-dialog`: passed and resolved the current Base UI docs/API URLs.
- `npm ci`: passed after temporarily stopping the pre-existing local `next dev` process that held the Windows Lightning CSS binary open; the clean install added 683 packages and audited 684.
- `npx tsc --noEmit`: passed.
- Current post-upgrade `npx tsc --noEmit`: passed.
- `npx jest --runInBand`: passed, 11/11 suites and 34/34 tests. The historical five-test baseline failures documented in `mocker/README.md` did not recur; no test was weakened.
- Current post-upgrade `npx jest --runInBand`: passed, 12/12 suites and 36/36 tests.
- Current focused `npx jest utils/auth.test.ts lib/orderSchemas.test.ts --runInBand`: passed, 2/2 suites and 6/6 tests.
- `npm run build`: passed; the expected fixture and domain files were not modified.
- Current post-upgrade `npm run build`: passed; the expected fixture and domain files were not modified.
- `npm run mock:order:ingest`: passed, 5,131 batches sent and 0 failed.
- Historical migration baseline (prior pass, not this dependency-upgrade pass): `npm run golden:orders` passed, 220,124 orders exported to a temporary file; expected and actual SHA-256 hashes matched (`6775375bd98d636d5fd89b2d40540193f3e1391ce32d64f213c4e86b186b326e`).
- Current post-upgrade `npm run golden:orders`: passed; the expected and actual SHA-256 hashes matched (`6775375bd98d636d5fd89b2d40540193f3e1391ce32d64f213c4e86b186b326e`).
- `git diff --check`: passed.

## Behavior changes

- No shipped behavior changes result from this final sweep: every deleted Radix wrapper was unreachable, and the illustrative code string is not rendered by an application consumer.
- Previously recorded Base UI differences remain intentional and require manual confirmation: Tabs use manual keyboard activation, menu state uses Base UI data attributes, and the Base Nova wrappers carry the documented visual spacing, radius, transition, and responsive-shell differences.

## Verify by hand

- Run sign-up, sign-in, password recovery, password update, sign-out, and protected-route redirect flows.
- On desktop and mobile, exercise sidebar navigation, account/theme menus, responsive sheet behavior, focus return, Escape dismissal, and keyboard navigation.
- On Deals, load data, search, filter tiers, set flip parameters, sort, hide/show columns, paginate, refresh, expand rows, inspect order details, and run reset/delete confirmations.
- Open selects, popovers, menus, tabs, tooltips, dialogs, checkboxes, and toast notifications; verify accessible names, typeahead/arrow navigation, Enter/Space activation for tabs, outside/Escape dismissal, and focus return.
- Verify light/dark/system theme switching and responsive layout at narrow and desktop widths.

## Residual known warnings

- The dependency install reports the existing `glob` notice and two audit vulnerabilities (one low, one high); no audit fix was applied in this migration.
- `npm outdated --json` still reports unrelated newer majors for `@tanstack/react-table`, `lucide-react`, `react-day-picker`, `react-resizable-panels`, and `typescript`; this pass only performed the explicitly requested Zod 4 and Recharts 3 compatibility work.
- Production build retains the Edge Runtime deprecation and the warning that Edge Runtime disables static generation for affected pages.
- A supplementary `npm ls --depth=0` on Windows reports Next's platform-optional `@img/sharp-wasm32` and `@emnapi/runtime` as extraneous; the clean install and production build still pass, and these are unrelated to the migration.
- The lockfile retains 16 Radix packages transitively required by `cmdk` and `vaul`: `@radix-ui/primitive`, `@radix-ui/react-compose-refs`, `@radix-ui/react-context`, `@radix-ui/react-dialog`, `@radix-ui/react-dismissable-layer`, `@radix-ui/react-focus-guards`, `@radix-ui/react-focus-scope`, `@radix-ui/react-id`, `@radix-ui/react-portal`, `@radix-ui/react-presence`, `@radix-ui/react-primitive`, `@radix-ui/react-slot`, `@radix-ui/react-use-callback-ref`, `@radix-ui/react-use-controllable-state`, `@radix-ui/react-use-effect-event`, and `@radix-ui/react-use-layout-effect`.
