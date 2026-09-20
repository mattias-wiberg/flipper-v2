# command

2026-09-20, classification only, intentionally left on cmdk because it is not a Radix wrapper and has no Base UI counterpart.

## Changed

- `components/ui/command.tsx`: no migration was performed; the wrapper continues to expose cmdk command, input, list, group, item, and dialog composition. Search icon sizing is owned by the input wrapper.
- Leftover scan: `grep -n "radix-ui\|@radix-ui" components/ui/command.tsx` is clean.

## Left alone

- `cmdk` and its command API were intentionally retained per the migration scope; replacing a non-Radix library would change behavior without a migration requirement.

## Behavior changes

None.

## Verify by hand

- Open command dialogs, type to filter, move through grouped results, select an item, and verify Escape dismissal and focus return.
