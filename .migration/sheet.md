# Migration Report: sheet
- Date: 2026-09-20
- Strategy: CLI golden pair from the current base-nova registry, replacing the Radix dialog primitives at the shared wrapper boundary.

## Before
- Radix dialog root, overlay, content, and close button.

## After
- Base UI Dialog aliases for root, backdrop, popup, portal, title, description, trigger, and close.
- Close control composes the existing Base UI Button through `render`.

## Behavior deltas
- Nova backdrop, popup placement, and transition state attributes are used.
- Sidebar mobile content retains its existing side and accessible title/description.

## Compatibility and scope
- Public wrapper names and the sidebar call site remain unchanged.

## Verification
- `npx tsc --noEmit`
- `npm run build`
