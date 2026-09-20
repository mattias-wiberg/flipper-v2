# select

2026-09-20, golden pair via CLI plus consumer sweep, migrated the deal-table page-size select to Base UI.

## Changed

- `components/ui/select.tsx`: replaced Radix Select with Base UI Root, Trigger, Value, Portal, Positioner, Popup, List, Item, ItemText, ItemIndicator, Group, GroupLabel, Separator, and scroll-arrow parts. Positioning now uses `alignItemWithTrigger` and Base UI state attributes.
- `app/authenticated/deals/components/data-table-pagination.tsx`: retained the public page-size behavior and replaced spacing utilities with `gap` utilities.
- `components/ui/select.tsx` leftover scan: `grep -n "radix-ui\|@radix-ui"` is clean.

## Left alone

- `package.json` and Radix select dependencies: dependency cleanup is outside this progressive migration.

## Behavior changes

- Select values are still numeric strings in this consumer, so Base UI's value-label behavior is unchanged for the visible page-size labels.

## Verify by hand

- Open Rows per page, use pointer and Arrow keys to select every page size, and confirm the table count and page index update.
- Confirm Escape/outside press closes the popup and focus returns to the trigger.
