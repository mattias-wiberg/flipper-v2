# calendar

2026-09-20, current react-day-picker v9 API contract update, intentionally kept on react-day-picker.

## Changed

- `components/ui/calendar.tsx`: added locale-aware month formatting and day data, switched the month grid class key to the current v9 API, and passed locale through the custom DayButton.
- Leftover scan: no Radix import exists in this component.

## Left alone

- `react-day-picker` remains the calendar implementation; no Base UI calendar replacement was introduced.
- No calendar consumer currently exists in the application.

## Behavior changes

None intended. Locale formatting is now honored when supplied.

## Verify by hand

- Navigate months with mouse and keyboard and confirm focus stays on the selected day.
- Check single, range, outside, disabled, today, and dropdown states.
