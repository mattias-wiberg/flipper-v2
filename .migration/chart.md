# chart

2026-09-20, Recharts 3 migration using the current installed type surface, upgraded successfully while intentionally remaining on Recharts.

## Changed

- `components/ui/chart.tsx`: retained the initial responsive dimension option, chart data-slot marker, nullish-safe ids, hidden payload filtering, and zero-valued tooltip behavior; updated custom tooltip and legend props to Recharts 3 types.
- `package.json` and `package-lock.json`: pin direct `recharts` to `3.10.1`.
- Leftover scan: no Radix import exists in this component.

## Left alone

- No chart consumer currently exists in the application, so no chart rendering call site was changed.

## Behavior changes

None intended. Entries with Recharts type `none` continue to be omitted from generated tooltip and legend rows.

## Verify by hand

- Render a chart with light/dark theme colors and confirm the responsive container initializes.
- Hover data points and confirm labels, zero values, indicators, and legend entries render correctly.
