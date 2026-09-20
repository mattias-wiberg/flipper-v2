# alert-dialog

2026-09-20, transformation engine guided by the current Base UI registry, migrated successfully.

## Changed

- `components/ui/alert-dialog.tsx`: replaced Radix parts with Base UI Root, Trigger, Portal, Backdrop, Popup, Title, Description, and Close; composed Action and Cancel buttons with Base UI `render`.
- `AlertDialogAction` uses Base UI Close so existing action semantics still dismiss the dialog.
- Leftover scan: `grep -n "radix-ui\|@radix-ui" components/ui/alert-dialog.tsx` is clean.

## Left alone

- No application consumer currently imports the alert-dialog wrapper.
- `components/reset-dialog.tsx` continues to use the shared dialog wrapper because its existing dismissible-dialog behavior is intentional.

## Behavior changes

None intended. The wrapper preserves modal focus management, Escape handling, accessible title/description wiring, and action/cancel dismissal.

## Verify by hand

- Open an alert dialog and confirm initial focus is inside the popup.
- Confirm Tab and Shift+Tab stay within the popup and Escape dismisses it.
- Confirm Action and Cancel both close the popup and focus returns to the trigger.
