# deal-discovery-controls

2026-09-20, consumer sweep, completed the deal-discovery control migration and recorded the URL-state preservation fix.

## Changed

- `app/authenticated/deals/components/data-table-toolbar.tsx`: refresh tooltip now uses Base UI `render` composition.
- `app/authenticated/deals/components/data-table-faceted-filter.tsx`: facet trigger uses `render`; command search remains on `cmdk`.
- `app/authenticated/deals/components/data-table-deal-options.tsx`: options trigger uses `render`; saving options now merges current query parameters and deletes only default option values.
- `app/authenticated/deals/components/data-table-column-header.tsx`: sorting and hide actions use the Base UI menu trigger.
- `app/authenticated/deals/components/data-table-view-options.tsx`: removed the direct Radix import and migrated visibility controls.
- `app/authenticated/deals/components/data-table-query.ts`: added the pure URL merge helper.
- `app/authenticated/deals/components/columns.test.ts`: covers displayed-location sorting plus filtering, pagination, and visibility state.
- `app/authenticated/deals/components/data-table-query.test.ts`: covers preserving unrelated parameters and removing defaults.
- `components/ui/command.tsx`: kept `cmdk`; removed only its direct Radix dialog type import in favor of the local dialog wrapper type.

## Left alone

- `data-table-row-actions.tsx`, `data-table-reset-actions.tsx`, domain deal rules, order actions, shell/auth files, manifests/config, schema, and golden fixture were intentionally not edited.

## Behavior changes

- URL saves preserve unrelated parameters such as `tier` instead of discarding them.
- Tabs use Base UI's manual activation default; see `tabs.md`.
- Browser interaction with authenticated deal data was not available because the local session redirected to `/log-in`.

## Verify by hand

- Search by name, select Tier facets with keyboard typeahead, sort columns, toggle visibility, change page size, refresh, save/reset options, and verify URL parameters survive each operation.
