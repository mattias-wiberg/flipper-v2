# calendar

2026-09-20, upgraded to react-day-picker v10.0.1, intentionally kept on react-day-picker.

## Changed

- `components/ui/calendar.tsx`: retained the current DayPicker v10 API (`DayPicker`, `DayButton`, `getDefaultClassNames`, `components`, and `classNames`) with no deprecated props.
- Calendar chevron sizing is delegated to the surrounding button/caption styles rather than manual child icon classes.
- `package.json` and `package-lock.json`: upgraded `react-day-picker` to `10.0.1`.
- Leftover scan: no Radix import exists in this component.

## Left alone

- `react-day-picker@10.0.1` remains the calendar implementation; no Base UI calendar replacement was introduced.
- No calendar consumer currently exists in the application.

## Behavior changes

None intended. Locale formatting is now honored when supplied.

## Verify by hand

- Navigate months with mouse and keyboard and confirm focus stays on the selected day.
- Check single, range, outside, disabled, today, and dropdown states.
