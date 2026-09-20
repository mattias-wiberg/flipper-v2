# table

2026-09-20, upgraded to @tanstack/react-table v9.2.4 and migrated the reachable Deals table to the current feature-based API.

## Changed

- `app/authenticated/deals/components/data-table-config.ts`: registers the stock features, built-in filter/sort registries, and the filtered, faceted, paginated, and sorted row-model factories through `tableFeatures`.
- `data-table.tsx`: uses `useTable`, passes the explicit feature set, and reads current state through `table.state` in child controls.
- Table column, row, column-definition, and table types now include the registered v9 feature set instead of the removed v8 single-data generic.
- `columns.test.ts`: uses `constructTable` with the documented store reactivity bindings and v9 `initialState`.
- `package.json` and `package-lock.json`: upgraded `@tanstack/react-table` to `9.2.4`.

## Left alone

- The existing Deals table behavior, columns, filters, sorting, pagination, visibility controls, row expansion, and action handlers remain unchanged.
- No legacy v8 compatibility imports were added.

## Behavior changes

None intended.

## Verify by hand

- Search and filter deals, sort by location, hide/show columns, paginate, refresh, expand rows, and use row actions.
