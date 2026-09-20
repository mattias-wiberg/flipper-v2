# command

2026-09-20, cmdk retained as the command implementation; fixed the standalone input icon sizing regression.

## Changed

- `components/ui/command.tsx`: the wrapper continues to expose cmdk command, input, list, group, item, and dialog composition. `CommandInput` now owns the search icon's `size-4`; the dialog no longer overrides that standalone icon through a descendant selector.
- Leftover scan: `grep -n "radix-ui\|@radix-ui" components/ui/command.tsx` is clean.

## Left alone

- `cmdk` and its command API were intentionally retained per the migration scope; replacing a non-Radix library would change behavior without a migration requirement.

## Behavior changes

The standalone `CommandInput` search icon is consistently sized in both inline and dialog composition.

## Verify by hand

- Open command dialogs, type to filter, move through grouped results, select an item, and verify Escape dismissal and focus return.
