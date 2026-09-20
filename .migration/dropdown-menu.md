# dropdown-menu

2026-09-20, golden pair via CLI plus consumer sweep, migrated the discovery and shared menu surface to Base UI while retaining a Base-only trigger mapping for excluded row/reset consumers.

## Changed

- `components/ui/dropdown-menu.tsx`: replaced the dual Base UI/Radix tree with Base UI Menu root, trigger, portal, positioner, popup, group, item, checkbox, radio, submenu, separator, and indicator parts. Positioning and state classes now use Base UI attributes.
- `app/authenticated/deals/components/data-table-column-header.tsx`: changed the sorting/visibility trigger to `render` and updated its open-state class.
- `app/authenticated/deals/components/data-table-view-options.tsx`: removed the direct Radix trigger import, switched to the shared Base UI trigger, and grouped the label and checkbox items.
- `components/theme-switcher.tsx` and `components/user-nav.tsx`: existing Base UI `render` consumers remain compatible.
- `components/ui/dropdown-menu.tsx` leftover scan: `grep -n "radix-ui\|@radix-ui"` is clean.

## Left alone

- `app/authenticated/deals/components/data-table-row-actions.tsx` and `data-table-reset-actions.tsx`: explicitly excluded by the task. Their legacy `asChild` prop is translated directly to Base UI `render` inside the shared wrapper; no Radix branch remains.
- Radix dependencies in `package.json`: other project wrappers still use them and dependency removal is out of scope.

## Behavior changes

- Base UI menu state uses `data-popup-open`, `data-open`, `data-closed`, and `data-highlighted` instead of Radix `data-state` attributes.
- Base UI radio items close only when `closeOnClick` is supplied; the existing theme consumer supplies it explicitly.

## Verify by hand

- Open column-header menus and select ascending, descending, and hide.
- Open View, toggle several columns, and confirm the menu remains usable between toggles.
- Open theme/account/reset/row-action menus and verify focus return, arrow-key navigation, Escape dismissal, and submenu navigation.
