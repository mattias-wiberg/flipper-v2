# popover

2026-09-20, golden pair via CLI plus consumer sweep, migrated deal discovery popovers to Base UI `Portal > Positioner > Popup` composition.

## Changed

- `components/ui/popover.tsx`: replaced Radix Root, Trigger, Anchor, and Content with Base UI Root, Trigger, Portal, Positioner, Popup, Title, and Description wrappers; removed the custom checkbox-item helper.
- `app/authenticated/deals/components/data-table-faceted-filter.tsx`: uses `render` for the facet trigger and normalizes absent filter state to an empty selection.
- `app/authenticated/deals/components/data-table-deal-options.tsx`: uses `render` for the options trigger and owns its accessible checkbox rows.
- `components/ui/popover.tsx` and in-scope consumers leftover scan: `grep -n "radix-ui\|@radix-ui"` is clean.

## Left alone

- `components/ui/label.tsx`: already renders a native label and remains unchanged.
- The command search remains `cmdk`, not a popover/menu replacement.

## Behavior changes

- Base UI manages popup positioning and exposes `data-open`/`data-closed`; the removed Radix Anchor export has no direct Base UI counterpart and had no consumers.

## Verify by hand

- Open Tier, type into the command search, select and clear values, and confirm focus/typeahead behavior.
- Open Options, toggle all checkboxes, switch AND/OR, save, reset, and dismiss with Escape/outside press.
