import { metricsPath, pageviewCount } from "./analytics.js";

const WINDOW = { startAt: 1_700_000_000_000, endAt: 1_700_000_900_000 };
const CONFIG = {
  umami: { url: "https://umami.example.test", websiteId: "website-id" },
};

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

describe("Umami pageview count", () => {
  afterEach(() => jest.restoreAllMocks());

  it("reads pageviews from the website summary in the 15 minute window", async () => {
    const fetchSpy = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ pageviews: 5 }), { status: 200 }),
      );

    await expect(pageviewCount(CONFIG, "token")).resolves.toBe(5);

    const request = new URL(String(fetchSpy.mock.calls[0]?.[0]));
    expect(request.pathname).toBe("/api/websites/website-id/stats");
    expect(
      Number(request.searchParams.get("endAt")) -
        Number(request.searchParams.get("startAt")),
    ).toBe(15 * 60 * 1000);
  });

  it("fails when the summary carries no pageview count", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    await expect(pageviewCount(CONFIG, "token")).rejects.toThrow(
      "Umami website stats did not return a pageview count",
    );
  });
});
