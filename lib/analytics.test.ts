import { trackAnalyticsEvent } from "./analytics";

type UmamiStub = { track: jest.Mock };

const globalWithUmami = globalThis as { umami?: UmamiStub };

describe("analytics event dispatch", () => {
  afterEach(() => {
    delete globalWithUmami.umami;
  });

  it("makes no outbound call when the tracker is not loaded", () => {
    // Analytics disabled => no tracker script => no global => no requests.
    expect(() =>
      trackAnalyticsEvent("theme_change", { theme: "dark" }),
    ).not.toThrow();
  });

  it("makes no outbound call for events outside the explicit allowlist", () => {
    const track = jest.fn();
    globalWithUmami.umami = { track };

    trackAnalyticsEvent("identify", { email: "user@example.com" });
    trackAnalyticsEvent("login", {});
    trackAnalyticsEvent("purchase", { amount: 10 });

    expect(track).not.toHaveBeenCalled();
  });

  it("never treats inherited object properties as events", () => {
    const track = jest.fn();
    globalWithUmami.umami = { track };

    for (const name of ["constructor", "toString", "__proto__"]) {
      expect(() => trackAnalyticsEvent(name, { theme: "dark" })).not.toThrow();
    }

    expect(track).not.toHaveBeenCalled();
  });

  it("ignores inherited object names without throwing", () => {
    const track = jest.fn();
    globalWithUmami.umami = { track };

    for (const name of ["constructor", "toString", "__proto__"]) {
      expect(() => trackAnalyticsEvent(name, {})).not.toThrow();
    }

    expect(track).not.toHaveBeenCalled();
  });

  it("sends explicitly defined events with redacted data only", () => {
    const track = jest.fn();
    globalWithUmami.umami = { track };

    trackAnalyticsEvent("theme_change", {
      theme: "dark",
      email: "user@example.com",
    });

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("theme_change", { theme: "dark" });
    expect(JSON.stringify(track.mock.calls)).not.toContain("@");
  });

  it("sends the event name alone when every value is redacted", () => {
    const track = jest.fn();
    globalWithUmami.umami = { track };

    trackAnalyticsEvent("theme_change", { theme: "user@example.com" });

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("theme_change");
  });

  it("does nothing when the tracker surface is malformed", () => {
    globalWithUmami.umami = {} as UmamiStub;

    expect(() =>
      trackAnalyticsEvent("theme_change", { theme: "dark" }),
    ).not.toThrow();
  });
});
