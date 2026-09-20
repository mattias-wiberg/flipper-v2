import { formatNumber, formatTimeDelta } from "./locale";

describe("formatNumber", () => {
  it("formats silver values without fractional digits", () => {
    expect(formatNumber(1234567.8)).toBe(
      (1234567.8).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    );
  });
});

describe("formatTimeDelta", () => {
  it("uses compact labels for recent order ages", () => {
    expect(formatTimeDelta(0)).toBe("just now");
    expect(formatTimeDelta(5 * 60 * 1000)).toBe("5m ago");
    expect(formatTimeDelta(2 * 60 * 60 * 1000)).toBe("2h ago");
    expect(formatTimeDelta(3 * 24 * 60 * 60 * 1000)).toBe("3d ago");
  });
});
