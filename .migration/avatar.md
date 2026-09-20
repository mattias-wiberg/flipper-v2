# avatar

2026-09-20, golden pair via CLI from the current base-nova registry, migrated successfully.

## Changed

- `components/ui/avatar.tsx`: uses Base UI Avatar root, image, and fallback parts while preserving the existing sizing and fallback styling.
- `components/user-nav.tsx`: keeps the Base UI avatar consumer and uses the project sizing utilities for the account trigger.
- Leftover scan: `grep -n "radix-ui\|@radix-ui" components/ui/avatar.tsx components/user-nav.tsx` is clean.

## Left alone

- Avatar fallback content and account-menu behavior were not changed.

## Behavior changes

None intended.

## Verify by hand

- Open the account menu while signed in and confirm the avatar fallback remains visible.
- Check the trigger at desktop and narrow widths and verify focus return after dismissal.
