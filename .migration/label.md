# label

2026-09-20, classification only, intentionally retained as a native label because Base UI has no Label primitive counterpart.

## Changed

- `components/ui/label.tsx`: no primitive migration was performed; the wrapper remains a styled native `label` with forwarded props and ref.
- Leftover scan: `grep -n "radix-ui\|@radix-ui" components/ui/label.tsx` is clean.

## Left alone

- Native label association and the existing disabled/error styling contract were preserved.

## Behavior changes

None.

## Verify by hand

- Click labels for auth and deal fields and confirm focus moves to the associated control.
