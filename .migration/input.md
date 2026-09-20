# input

2026-09-20, golden pair via CLI from the current base-nova registry, migrated successfully.

## Changed

- `components/ui/input.tsx`: uses the Base UI Input primitive while preserving the existing native input props and project styles.
- Auth and deal filters continue to consume the shared Base UI input wrapper.
- Leftover scan: `grep -n "radix-ui\|@radix-ui" components/ui/input.tsx` is clean.

## Left alone

- Input values, types, browser validation, placeholders, and disabled styling remain unchanged.

## Behavior changes

None intended.

## Verify by hand

- Type into auth and deal filters, submit invalid values, and verify focus, placeholder, disabled, and validation behavior.
