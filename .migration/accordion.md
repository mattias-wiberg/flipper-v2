# Migration Report: accordion
- Date: 2026-09-20
- Strategy: CLI golden pair from the current base-nova registry, using Lucide icons already installed in the project.

## Before
- Radix accordion root, item, trigger, header, and content.

## After
- Base UI Accordion root, item, header, trigger, and panel.
- Nova open/closed animation attributes and explicit open/closed icons are used.

## Behavior deltas
- The wrapper follows Base UI panel height and state conventions.

## Compatibility and scope
- No current consumer required an API bridge.

## Verification
- `npx tsc --noEmit`
- `npm run build`
