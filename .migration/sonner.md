# sonner

2026-09-20, current Sonner API contract update, intentionally kept on Sonner.

## Changed

- `components/ui/sonner.tsx`: typed the wrapper with Sonner `ToasterProps`, added current status icons, loading animation, and Sonner CSS variables while preserving caller overrides and existing toast class names.
- Leftover scan: no Radix import exists in this component.

## Left alone

- `sonner` remains the toast implementation; it was not replaced with a Base UI primitive.
- Existing toast call sites and their success/error messages were not changed.

## Behavior changes

None intended.

## Verify by hand

- Trigger success, info, warning, error, and loading toasts in light and dark themes.
- Confirm descriptions, action/cancel buttons, positioning, and dismissal behavior remain intact.
