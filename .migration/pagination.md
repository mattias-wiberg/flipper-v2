# pagination

2026-09-20, classification only, intentionally retained as a native link-based wrapper because it is not a Radix primitive.

## Changed

- `components/ui/pagination.tsx`: preserved the existing link/button-variant API, moved icon sizing to component-level selectors, and marked text-adjacent icons with `data-icon` metadata.
- Leftover scan: `grep -n "radix-ui\|@radix-ui" components/ui/pagination.tsx` is clean.

## Left alone

- Pagination link semantics, active state, labels, and keyboard behavior remain unchanged.

## Behavior changes

None intended.

## Verify by hand

- Activate previous, next, and page links with mouse and keyboard and confirm active-page semantics and accessible labels.
