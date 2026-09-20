# chart

2026-09-20, current Recharts v2-compatible API contract update, intentionally kept on Recharts.

## Changed

- `components/ui/chart.tsx`: added the current initial responsive dimension option and chart data-slot marker, made chart ids nullish-safe, filtered hidden tooltip/legend payload entries, and preserved zero-valued tooltip values.
- Leftover scan: no Radix import exists in this component.

## Left alone

- `recharts@2.15.4` remains the chart implementation; no Recharts 3 or Base UI dependency was installed.
- No chart consumer currently exists in the application.

## Behavior changes

None intended. Entries with Recharts type `none` are now omitted from generated tooltip and legend rows.

## Verify by hand

- Render a chart with light/dark theme colors and confirm the responsive container initializes.
- Hover data points and confirm labels, zero values, indicators, and legend entries render correctly.
