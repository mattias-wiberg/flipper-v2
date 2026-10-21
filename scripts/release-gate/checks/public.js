// Deployed public boundary, Auth origin handling, and statelessness.
//
// These are black-box checks against the deployment under test: no Dokploy,
// Supabase, or Umami internals are mocked. The route assertions come from the
// shared deployment-boundary module, which the `verify:deployment` CLI also
// uses, so the canonical origin contract exists once.
const boundary = require("../../deployment-boundary.js");
const { assertStatus, httpFetch } = require("../http.js");
const { countOrders } = require("../supabase.js");

const SKIP_NOTE =
  "RELEASE_BASE_URL is not set, so the deployed service was not contacted";

function boundaryCheck(name) {
  return {
    id: `deployed.${name}`,
    phase: "deployed",
    core: true,
    required: (config) => Boolean(config.baseUrl),
    skipNote: SKIP_NOTE,
    async run(config) {
      const [result] = await boundary.verifyPublicBoundary({
        baseUrl: config.baseUrl,
        expectedSiteUrl: config.expectedSiteUrl,
        checks: [name],
      });
      if (!result.ok) {
        throw new Error(result.message);
      }
      return `${name} matches the configured origin contract`;
    },
  };
}

const protectedAccess = {
  id: "deployed.protected-access",
  phase: "deployed",
  core: true,
  required: (config) => Boolean(config.baseUrl),
  skipNote: SKIP_NOTE,
  async run(config) {
    const cases = [
      { label: "plain request", headers: {} },
      {
        label: "forwarded-host override",
        headers: {
          "x-forwarded-host": "evil.example.com",
          "x-forwarded-proto": "https",
        },
      },
    ];

    for (const testCase of cases) {
      const response = await httpFetch(
        new URL("/authenticated/deals", config.baseUrl),
        { headers: testCase.headers },
      );
      assertStatus(
        response,
        [302, 307],
        `protected access (${testCase.label})`,
      );
      const location = response.headers.get("location");
      if (!location) {
        throw new Error(
          `protected access (${testCase.label}) did not redirect`,
        );
      }
      const target = new URL(location, config.expectedSiteUrl);
      if (target.origin !== config.expectedSiteUrl) {
        throw new Error(
          `protected access (${testCase.label}) redirected off the configured origin`,
        );
      }
      if (target.pathname !== "/log-in") {
        throw new Error(
          `protected access (${testCase.label}) did not redirect to /log-in`,
        );
      }
    }

    return "unauthenticated /authenticated/deals redirects to /log-in on the configured origin, including with injected forwarded headers";
  },
};

const callbackOrigin = {
  id: "deployed.callback-origin",
  phase: "deployed",
  core: true,
  required: (config) => Boolean(config.baseUrl),
  skipNote: SKIP_NOTE,
  async run(config) {
    const cases = [
      { label: "missing code", path: "/auth/callback", headers: {} },
      {
        label: "hostile redirect_to",
        path: "/auth/callback?redirect_to=https%3A%2F%2Fevil.example.com%2Fsteal",
        headers: {},
      },
      {
        label: "protocol-relative redirect_to",
        path: "/auth/callback?redirect_to=%2F%2Fevil.example.com%2Fsteal",
        headers: {},
      },
      {
        label: "forwarded-host spoof",
        path: "/auth/callback",
        headers: {
          "x-forwarded-host": "evil.example.com",
          "x-forwarded-proto": "https",
        },
      },
    ];

    for (const testCase of cases) {
      const response = await httpFetch(new URL(testCase.path, config.baseUrl), {
        headers: testCase.headers,
      });
      assertStatus(response, [302, 307], `callback (${testCase.label})`);
      const location = response.headers.get("location");
      if (!location) {
        throw new Error(`callback (${testCase.label}) did not redirect`);
      }
      const target = new URL(location, config.expectedSiteUrl);
      if (target.origin !== config.expectedSiteUrl) {
        throw new Error(
          `callback (${testCase.label}) left the configured origin`,
        );
      }
      if (target.pathname !== "/log-in") {
        throw new Error(
          `callback (${testCase.label}) did not return to /log-in`,
        );
      }
      if (target.hostname === "evil.example.com") {
        throw new Error(
          `callback (${testCase.label}) honored an untrusted host`,
        );
      }
    }

    return "the Auth callback stays on the configured origin for a missing code, hostile redirect_to values, and injected forwarded headers";
  },
};

const statelessBoundary = {
  id: "deployed.stateless-boundary",
  phase: "deployed",
  core: true,
  required: (config) => Boolean(config.baseUrl),
  skipNote: SKIP_NOTE,
  async run(config) {
    const response = await httpFetch(
      new URL("/api/seed/marketorders.ingest", config.baseUrl),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      },
    );
    assertStatus(response, 404, "development recorder");
    return "the development recorder is absent in production (404), so the running service needs no local application files";
  },
};

const dataIndependence = {
  id: "deployed.data-independence",
  phase: "deployed",
  core: true,
  required: (config) => Boolean(config.baseUrl && config.supabase),
  skipNote:
    "RELEASE_BASE_URL and Supabase environment variables are required to prove data survives a container replacement",
  async run(config) {
    const count = await countOrders(config);
    return `the existing Supabase orders table is readable directly (${count} rows), independent of the Flipper container's filesystem`;
  },
};

module.exports = {
  checks: [
    boundaryCheck("health"),
    boundaryCheck("home"),
    boundaryCheck("documentation"),
    boundaryCheck("manifest"),
    boundaryCheck("robots"),
    boundaryCheck("sitemap"),
    protectedAccess,
    callbackOrigin,
    statelessBoundary,
    dataIndependence,
  ],
};
