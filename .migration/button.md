# button

2026-09-20, golden pair via CLI from the current base-nova registry, migrated successfully.

## Changed

- `components/ui/button.tsx`: uses the Base UI Button primitive with the existing CVA variants and supports Base UI `render` composition.
- Button consumers use `render` for links and trigger composition; visible prefix/suffix icons use the project `data-icon` convention.
- Leftover scan: `grep -n "radix-ui\|@radix-ui" components/ui/button.tsx` is clean.

## Left alone

- Existing button variants, dimensions, and disabled/focus styling remain unchanged.

## Behavior changes

Base UI render composition replaces the former child-composition boundary; no user-visible behavior change is intended.

## Verify by hand

- Exercise default, outline, ghost, link, icon, and disabled buttons.
- Activate link and menu trigger buttons with keyboard and verify focus-visible styling.
