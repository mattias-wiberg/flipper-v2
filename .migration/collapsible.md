# Migration Report: collapsible
- Date: 2026-09-20
- Strategy: CLI golden pair from the current base-nova registry, with a narrow `asChild` bridge for unchanged deal-table rows.

## Before
- Radix collapsible root, trigger, and content.

## After
- Base UI Collapsible root, trigger, and panel.
- Token tutorial headings use a real button through `render`.

## Behavior deltas
- Base UI panel transitions and state attributes are used.
- Non-button legacy render targets explicitly opt out of native button semantics.

## Compatibility and scope
- Existing deal-table row composition remains unchanged.

## Verification
- `npx tsc --noEmit`
- `npm run build`
