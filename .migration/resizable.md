# resizable

2026-09-20, upgraded to react-resizable-panels v4.12.4, intentionally kept on react-resizable-panels.

## Changed

- `components/ui/resizable.tsx`: mapped the app-facing wrappers to the v4 `Group`, `Panel`, and `Separator` primitives and their `GroupProps`, `PanelProps`, and `SeparatorProps` types. Orientation styling now follows v4's `aria-orientation` separator attribute.
- The optional handle wrapper now owns the grip icon size instead of a manual child icon size.
- `package.json` and `package-lock.json`: upgraded `react-resizable-panels` to `4.12.4`.
- Leftover scan: no Radix import exists in this component.

## Left alone

- `react-resizable-panels@4.12.4` remains the panel implementation; the existing app-facing export names were retained for callers.
- No resizable consumer currently exists in the application.

## Behavior changes

None intended.

## Verify by hand

- Drag a horizontal and vertical resize handle with mouse and keyboard.
- Confirm focus-visible styling, panel layout, and the optional handle grip remain usable.
