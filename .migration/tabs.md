# tabs

2026-09-20, golden pair via CLI plus consumer sweep, migrated the deal-options gate tabs to Base UI while preserving the local `size` API.

## Changed

- `components/ui/tabs.tsx`: replaced Radix Root/List/Trigger/Content with Base UI Root/List/Tab/Panel and changed active-state styling to `data-active`.
- `app/authenticated/deals/components/data-table-deal-options.tsx`: controls the AND/OR tab value from local form state and accepts only the two valid gate values.
- `components/ui/tabs.tsx` leftover scan: `grep -n "radix-ui\|@radix-ui"` is clean.

## Left alone

- Existing `size` variants remain because the deal-options control is the only consumer and its visual sizing is part of the current UI.

## Behavior changes

- Base UI Tabs defaults to manual activation, unlike Radix's default automatic activation. This is intentional Base UI behavior and should be checked with keyboard focus plus Enter/Space.

## Verify by hand

- Open Options, use Tab/Arrow keys to move between AND and OR, activate with Enter/Space, and confirm the selected gate is saved.
