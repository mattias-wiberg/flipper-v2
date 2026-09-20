# resizable

2026-09-20, current react-resizable-panels v3 API contract update, intentionally kept on react-resizable-panels.

## Changed

- `components/ui/resizable.tsx`: typed wrappers with the package's exported `PanelGroupProps`, `PanelProps`, and `PanelResizeHandleProps`, added data-slot markers, and preserved the v3 PanelGroup/PanelResizeHandle API.
- The optional handle wrapper now owns the grip icon size instead of a manual child icon size.
- Leftover scan: no Radix import exists in this component.

## Left alone

- `react-resizable-panels@3.0.6` remains the panel implementation; no newer package API was assumed.
- No resizable consumer currently exists in the application.

## Behavior changes

None intended.

## Verify by hand

- Drag a horizontal and vertical resize handle with mouse and keyboard.
- Confirm focus-visible styling, panel layout, and the optional handle grip remain usable.
