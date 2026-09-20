# carousel

2026-09-20, classification only, intentionally retained on embla-carousel-react because it is not a Radix wrapper and has no Base UI counterpart.

## Changed

- `components/ui/carousel.tsx`: no primitive migration was performed; the existing Embla context and controls remain intact, with child icon sizing delegated to the shared button styles.
- Leftover scan: `grep -n "radix-ui\|@radix-ui" components/ui/carousel.tsx` is clean.

## Left alone

- `embla-carousel-react` behavior, orientation handling, keyboard controls, and carousel API were not changed.

## Behavior changes

None intended.

## Verify by hand

- Move through a carousel with pointer and keyboard controls and confirm previous/next disabled states.
