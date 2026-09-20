# tooltip

2026-09-20, golden pair via CLI plus consumer sweep, completed the discovery-toolbar tooltip migration to the Base UI positioning model.

## Changed

- `components/ui/tooltip.tsx`: removed the legacy `asChild` bridge and exposed Base UI Provider, Root, Trigger, Portal, Positioner, Popup, and Arrow parts.
- `app/authenticated/deals/components/data-table-toolbar.tsx`: changed the refresh tooltip trigger to `render` composition.
- `components/ui/tooltip.tsx` and the in-scope toolbar consumer leftover scan: `grep -n "radix-ui\|@radix-ui"` is clean.

## Left alone

- Existing token, order-detail, column, and sidebar consumers already use Base UI `render` composition.
- Tooltip provider remains configured with the existing zero-delay behavior.

## Behavior changes

- Base UI uses `data-open`/`data-closed` and positioning attributes instead of Radix `data-state` attributes.

## Verify by hand

- Hover or focus the refresh button and confirm the tooltip appears below it.
- Press Escape or move focus away and confirm the popup closes and focus remains on the trigger.
