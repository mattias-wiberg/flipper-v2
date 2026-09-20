# form

2026-09-20, classification only, intentionally retained because the wrapper is built on react-hook-form and native form semantics rather than Radix.

## Changed

- `components/ui/form.tsx`: no primitive migration was performed; the existing field context, controller, label, control, description, and message helpers remain in place.
- Leftover scan: `grep -n "radix-ui\|@radix-ui" components/ui/form.tsx` is clean.

## Left alone

- `react-hook-form` controller behavior and the existing `cloneElement` accessibility attributes were not rewritten.

## Behavior changes

None.

## Verify by hand

- Submit each auth form with invalid and valid values and verify labels, descriptions, and field errors remain associated.
