# checkbox

2026-09-20, golden pair via CLI plus consumer sweep, migrated the checkbox primitive needed by deal-options popover rows to Base UI.

## Changed

- `components/ui/checkbox.tsx`: replaced Radix Checkbox with Base UI Root/Indicator and updated state selectors to `data-checked`/`data-indeterminate`.
- Checkbox-root SVG styling now owns the indicator size instead of sizing the child icon directly.
- `app/authenticated/deals/components/data-table-deal-options.tsx`: replaced the removed popover checkbox helper with native-label composition around the shared Base UI checkbox.
- `components/ui/checkbox.tsx` leftover scan: `grep -n "radix-ui\|@radix-ui"` is clean.

## Left alone

- Existing reset-dialog and order-detail checkbox consumers were not edited; their existing controlled `checked`/`onCheckedChange` contracts remain supported.

## Behavior changes

- Base UI renders the checkbox as a span with a hidden input and uses presence attributes for checked state; labels and controlled change handlers remain intact.

## Verify by hand

- Toggle each deal option by clicking its label and checkbox, confirm keyboard focus/Space behavior, then save and reopen the popover.
