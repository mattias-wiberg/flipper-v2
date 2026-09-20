# dialog

2026-09-20, transformation engine guided by the current Base UI registry, migrated successfully.

## Changed

- `components/ui/dialog.tsx`: replaced the Radix dialog parts with Base UI Root, Trigger, Portal, Backdrop, Popup, Title, Description, and Close parts; used `render` for the close button and retained the existing visual contract.
- `components/reset-dialog.tsx`: replaced `DialogClose asChild` with Base UI `render` composition and gave each preference checkbox a unique id.
- `components/ui/command.tsx`: kept `cmdk` and narrowed dialog children to `ReactNode` because Base UI Root also supports payload render functions.
- Leftover scan: `grep -n "radix-ui\|@radix-ui" components/ui/dialog.tsx components/reset-dialog.tsx components/ui/command.tsx` is clean.

## Left alone

- `components/ui/sheet.tsx` was already using the Base UI dialog family and was not changed.
- `components/ui/command.tsx` remains backed by `cmdk`; only its dialog prop boundary changed.

## Behavior changes

None intended. Base UI retains modal focus management, Escape dismissal, focus return, and accessible title/description wiring.

## Verify by hand

- Open the reset dialog from each reset menu and confirm focus lands inside the dialog.
- Tab through the checkbox and action buttons, then close with Cancel, the close button, and Escape.
- Confirm focus returns to the trigger and the two reset dialogs keep independent preference checkbox state.
