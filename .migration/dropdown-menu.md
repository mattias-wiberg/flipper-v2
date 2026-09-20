# dropdown-menu

2026-09-20, golden pair via CLI plus consumer sweep, migrated the discovery and shared menu surface to Base UI and completed the row/reset consumer audit.

## Changed

- `components/ui/dropdown-menu.tsx`: replaced the dual Base UI/Radix tree with Base UI Menu root, trigger, portal, positioner, popup, group, item, checkbox, radio, submenu, separator, and indicator parts. Positioning and state classes now use Base UI attributes.
- `app/authenticated/deals/components/data-table-column-header.tsx`: changed the sorting/visibility trigger to `render`, grouped menu items, added button icon metadata, and updated its open-state class.
- `app/authenticated/deals/components/data-table-view-options.tsx`: removed the direct Radix trigger import, switched to the shared Base UI trigger, and grouped the label and checkbox items.
- `app/authenticated/deals/components/data-table-reset-actions.tsx`: uses the Base UI `render` trigger, groups reset items, and marks the visible button icon.
- `app/authenticated/deals/components/data-table-row-actions.tsx`: uses the Base UI `render` trigger and groups submenu items.
- `components/theme-switcher.tsx` and `components/user-nav.tsx`: grouped radio/account items and removed manual child icon sizing while retaining Base UI `render` consumers.
- `components/ui/dropdown-menu.tsx` leftover scan: `grep -n "radix-ui\|@radix-ui"` is clean.

## Left alone

- `components/ui/dropdown-menu.tsx` retains the narrow `asChild` compatibility bridge for callers that have not yet moved to `render`; current row/reset callers now use `render` directly.
- `cmdk`, `vaul`, `sonner`, `input-otp`, `react-day-picker`, `recharts`, and `react-resizable-panels` remain on their intended non-Radix libraries.

## Behavior changes

- Base UI menu state uses `data-popup-open`, `data-open`, `data-closed`, and `data-highlighted` instead of Radix `data-state` attributes.
- Base UI radio items close only when `closeOnClick` is supplied; the existing theme consumer supplies it explicitly.

## Verify by hand

- Open column-header menus and select ascending, descending, and hide.
- Open View, toggle several columns, and confirm the menu remains usable between toggles.
- Open theme/account/reset/row-action menus and verify focus return, arrow-key navigation, Escape dismissal, and submenu navigation.
