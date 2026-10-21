import { metricPathname, metricsPath } from "./analytics.js";

const SITE = "https://beta.example.test";
const WINDOW = { startAt: 1_700_000_000_000, endAt: 1_700_000_900_000 };

describe("Umami URL metrics request", () => {
  it("asks for path groups with the Umami 3.4 type enum", () => {
    const requestPath = metricsPath("website-id", WINDOW);
    const query = new URLSearchParams(requestPath.split("?")[1]);

    expect(query.get("type")).toBe("path");
    expect(query.get("startAt")).toBe(String(WINDOW.startAt));
    expect(query.get("endAt")).toBe(String(WINDOW.endAt));
    expect(requestPath.startsWith("/api/websites/website-id/metrics?")).toBe(
      true,
    );
  });

  it("keeps a website id inside a single path segment", () => {
    expect(metricsPath("a/b", WINDOW)).toContain("/api/websites/a%2Fb/metrics");
  });
});

describe("Umami recorded pathname matching", () => {
  it("matches the paths Umami records for the home and documentation pages", () => {
    expect(metricPathname("/", SITE)).toBe("/");
    expect(metricPathname("/documentation", SITE)).toBe("/documentation");
  });

  it("normalises a full URL and ignores its query string", () => {
    expect(
      metricPathname("https://beta.example.test/documentation", SITE),
    ).toBe("/documentation");
    expect(metricPathname("/documentation?gate=1", SITE)).toBe(
      "/documentation",
    );
  });

  it("rejects a value that is not a usable URL", () => {
    expect(metricPathname("http://[", SITE)).toBeNull();
  });
});
