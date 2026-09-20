# Migration Report: separator
- Date: 2026-09-20
- Strategy: CLI golden pair from the current base-nova registry.

## Before
- Radix Separator root with Radix orientation/decorative props.

## After
- Base UI Separator with Nova orientation data attributes and tokenized sizing.

## Behavior deltas
- The shared wrapper now follows the Base UI separator contract; no consumer used the old decorative prop.

## Compatibility and scope
- Sidebar separators and public-page separators keep the same exported component name.

## Verification
- `npx tsc --noEmit`
- `npm run build`
