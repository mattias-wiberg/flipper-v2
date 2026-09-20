# input-otp

2026-09-20, current input-otp API contract update, intentionally kept on input-otp.

## Changed

- `components/ui/input-otp.tsx`: added current data-slot markers, disabled spell checking, and guarded optional OTP context slots while preserving the forwarded input ref and slot API.
- Leftover scan: no Radix import exists in this component.

## Left alone

- `input-otp` remains the underlying OTP implementation; no Base UI replacement was introduced.
- No OTP consumer currently exists in the application.

## Behavior changes

None intended.

## Verify by hand

- Enter, delete, and paste an OTP and confirm the caret moves between slots.
- Confirm disabled and invalid states remain visible and keyboard navigation works.
