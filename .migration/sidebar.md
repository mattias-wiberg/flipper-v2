# Migration Report: sidebar
- Date: 2026-09-20
- Strategy: CLI golden pair using the current base-nova registry source, with the existing sidebar API retained where it is app-owned.

## Before
- Radix Slot composition and a nested Radix tooltip provider.
- Sidebar controls used `asChild` internally and Radix state selectors.

## After
- Base UI `useRender` and `mergeProps` composition.
- Base-nova `data-*` state selectors, responsive Sheet rendering, and app-owned sidebar context.

## Behavior deltas
- Desktop collapse and mobile off-canvas behavior now use the Base UI sheet and current Nova transitions.
- The provider no longer nests another tooltip provider.

## Compatibility and scope
- Existing sidebar exports remain available.
- Deal-table files were not changed.

## Verification
- `npx tsc --noEmit`
- `npm run build`
