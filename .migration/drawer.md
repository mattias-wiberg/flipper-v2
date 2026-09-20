# drawer

2026-09-20, current Vaul API contract update, intentionally kept on Vaul.

## Changed

- `components/ui/drawer.tsx`: retained Vaul, added data-slot markers, exposed the current `DrawerHandle`, and kept the existing bottom drawer presentation.
- Leftover scan: no Radix import exists in this component; Vaul remains the underlying drawer library.

## Left alone

- `vaul` was intentionally not replaced with Base UI Drawer.
- No drawer consumers currently exist in the application.

## Behavior changes

None intended.

## Verify by hand

- Open and close a drawer with the trigger, close control, outside press, and Escape.
- Drag the handle on touch and desktop pointer input and confirm focus remains usable.
