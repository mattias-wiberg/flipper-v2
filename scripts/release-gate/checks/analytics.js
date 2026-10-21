// Umami product analytics: the deployed tracker, the real beacon payloads, the
// recorded page view, and the privacy contract on the wire.
//
// The gate loads the deployed pages in a real browser and inspects the exact
// requests the Umami tracker sends. It then reads the recorded data from Umami's
// own API. Nothing is mocked and no dashboard state is created by hand.
const { newContext, withBrowser } = require("../browser.js");
const { assertStatus, httpFetch, textOf } = require("../http.js");
const { STATUS } = require("../report.js");
const { findSensitiveValues, scanBeaconPayload } = require("../sensitive.js");
const { isSkip, skip } = require("../skip.js");

const SKIP_NOTE =
  "RELEASE_BASE_URL is not set, so the deployed service was not contacted";
const UMAMI_WINDOW_MS = 15 * 60 * 1000;
const BEACON_WAIT_MS = 3_000;
const PAGEVIEW_WAIT_MS = 30_000;

function attributeValue(tag, name) {
  const match = tag.match(
    new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"),
  );
  return match?.[1] ?? null;
}

function trackerTag(html) {
  return [...html.matchAll(/<script\b[^>]*>/gi)]
    .map(([tag]) => tag)
    .find((tag) =>
      /\/script\.js(?:\?.*)?$/.test(attributeValue(tag, "src") ?? ""),
    );
}

const tracker = {
  id: "deployed.analytics-tracker",
  phase: "deployed",
  core: true,
  required: (config) => Boolean(config.baseUrl),
  skipNote: SKIP_NOTE,
  async run(config) {
    const response = await httpFetch(new URL("/", config.baseUrl), {
      headers: { accept: "text/html" },
    });
    assertStatus(response, 200, "home page");
    const html = await response.text();
    const tag = trackerTag(html);
    if (!tag) {
      throw new Error(
        "the deployed home page renders no Umami tracker, so analytics is not part of this release",
      );
    }

    const expectedHostname = new URL(config.expectedSiteUrl).hostname;
    const expectations = [
      ["data-website-id", null],
      ["data-domains", expectedHostname],
      ["data-exclude-search", "true"],
      ["data-exclude-hash", "true"],
      ["data-do-not-track", "true"],
    ];
    for (const [name, expected] of expectations) {
      const value = attributeValue(tag, name);
      if (value === null) {
        throw new Error(`the Umami tracker tag is missing ${name}`);
      }
      if (expected !== null && value !== expected) {
        throw new Error(`the Umami tracker tag has an unexpected ${name}`);
      }
    }
    if (/data-distinct-id/i.test(tag)) {
      throw new Error("the Umami tracker attaches an identity attribute");
    }

    if (config.umami) {
      const source = attributeValue(tag, "src");
      if (!source) {
        throw new Error("the Umami tracker tag has no script source");
      }
      if (new URL(source).origin !== config.umami.url) {
        throw new Error(
          "the deployed tracker script is not served by the configured Umami origin",
        );
      }
    }

    return "the deployed page carries the Umami tracker for the configured website with query/hash exclusion, DNT, host restriction, and no identity attribute";
  },
};

async function umamiLogin(config) {
  const response = await httpFetch(
    new URL("/api/auth/login", config.umami.url),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: config.umami.username,
        password: config.umami.password,
      }),
    },
  );
  assertStatus(response, 200, "Umami login");
  const payload = await response.json();
  if (!payload?.token) {
    throw new Error("Umami login did not return an API token");
  }
  return payload.token;
}

function umamiWindow() {
  const endAt = Date.now();
  return { startAt: endAt - UMAMI_WINDOW_MS, endAt };
}

async function umamiGet(config, token, path) {
  return httpFetch(new URL(path, config.umami.url), {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
}

async function urlMetrics(config, token) {
  const { startAt, endAt } = umamiWindow();
  const response = await umamiGet(
    config,
    token,
    `/api/websites/${encodeURIComponent(
      config.umami.websiteId,
    )}/metrics?startAt=${startAt}&endAt=${endAt}&type=url`,
  );
  assertStatus(response, 200, "Umami URL metrics");
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function urlCount(config, token, pathname) {
  const metrics = await urlMetrics(config, token);
  const entry = metrics.find((metric) => {
    try {
      return new URL(metric.x, config.expectedSiteUrl).pathname === pathname;
    } catch {
      return false;
    }
  });
  return Number(entry?.y ?? 0);
}

async function waitForNewPageView(config, token, pathname, baseline) {
  const deadline = Date.now() + PAGEVIEW_WAIT_MS;
  let count = baseline;
  while (Date.now() < deadline) {
    count = await urlCount(config, token, pathname);
    if (count > baseline) {
      return count;
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  return count;
}

async function recordedEventFindings(config, token) {
  const { startAt, endAt } = umamiWindow();
  const response = await umamiGet(
    config,
    token,
    `/api/websites/${encodeURIComponent(
      config.umami.websiteId,
    )}/events?startAt=${startAt}&endAt=${endAt}&page=1&pageSize=50`,
  );
  if (response.status === 404 || response.status === 501) {
    throw skip(
      "this Umami release exposes no event listing endpoint; recorded event data was not scanned",
    );
  }
  assertStatus(response, 200, "Umami event listing");
  const payload = await response.json();
  const events = Array.isArray(payload) ? payload : payload?.data;
  if (!Array.isArray(events)) {
    throw new Error("Umami event listing returned an unexpected response");
  }
  return findSensitiveValues(events);
}

function formatFindings(findings) {
  return findings
    .slice(0, 5)
    .map((finding) => `${finding.rule} at ${finding.path}`)
    .join("; ");
}

const analytics = {
  id: "deployed.analytics",
  phase: "deployed",
  core: true,
  required: (config) => Boolean(config.baseUrl),
  skipNote: SKIP_NOTE,
  async run(config) {
    return withBrowser(async (browser) => {
      const results = [];
      const context = await newContext(browser, config.baseUrl);
      const page = await context.newPage();
      const beacons = [];
      page.on("request", (request) => {
        if (
          request.method() !== "POST" ||
          !/\/api\/send(?:\?|$)/.test(request.url())
        ) {
          return;
        }
        const body = request.postData();
        if (body) {
          beacons.push(body);
        }
      });

      let umamiToken = null;
      let baseline = null;
      let umamiError = null;
      if (config.umami) {
        try {
          umamiToken = await umamiLogin(config);
          baseline = await urlCount(config, umamiToken, "/");
        } catch (error) {
          umamiError =
            error instanceof Error ? error.message : "Umami API access failed";
        }
      }

      const queryMarker = `gate-${process.pid}`;
      try {
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await page
          .getByRole("heading", {
            name: "Dominate the Albion Black Market",
          })
          .waitFor();
        await page.goto(
          `/documentation?gate=${queryMarker}&secret=should-not-appear#gate-fragment`,
          { waitUntil: "domcontentloaded" },
        );
        await page.getByText("How to Use").first().waitFor();
        await page.waitForTimeout(BEACON_WAIT_MS);
      } finally {
        await context.close();
      }

      // The real beacon payloads the product sent.
      try {
        if (beacons.length === 0) {
          throw new Error(
            "the deployed pages sent no Umami beacon, so analytics is not recording",
          );
        }
        const payloads = [];
        const findings = [];
        for (const body of beacons) {
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch {
            findings.push({ path: "beacon", rule: "unparseable-beacon" });
            continue;
          }
          payloads.push(parsed);
          findings.push(...scanBeaconPayload(parsed));
        }
        if (findings.length > 0) {
          throw new Error(
            `an Umami beacon carried forbidden data: ${formatFindings(findings)}`,
          );
        }

        const viewUrls = payloads
          .map((payload) => payload.payload?.url)
          .filter((url) => typeof url === "string");
        const paths = viewUrls.map((url) => new URL(url, config.baseUrl));
        if (!paths.some((url) => url.pathname === "/")) {
          throw new Error("no Umami page view was sent for the home page");
        }
        const documentation = paths.find(
          (url) => url.pathname === "/documentation",
        );
        if (!documentation) {
          throw new Error("no Umami page view was sent for /documentation");
        }
        if (documentation.search || documentation.hash) {
          throw new Error(
            "an Umami beacon kept a query string or hash in the tracked URL",
          );
        }
        if (viewUrls.some((url) => url.includes(queryMarker))) {
          throw new Error(
            "an Umami beacon carried the gate's query-string marker",
          );
        }

        results.push({
          id: "deployed.analytics-beacons",
          status: STATUS.PASS,
          detail: `${payloads.length} beacon(s) captured: only allowlisted fields, no emails/tokens/cookies, and query strings and hashes are stripped`,
        });
      } catch (error) {
        results.push({
          id: "deployed.analytics-beacons",
          status: isSkip(error) ? STATUS.SKIP : STATUS.FAIL,
          detail:
            error instanceof Error ? error.message : "beacon check failed",
        });
      }

      // The page view Umami actually recorded for this visit.
      try {
        if (!config.umami) {
          throw skip(
            "UMAMI_URL / UMAMI_USERNAME / UMAMI_PASSWORD / UMAMI_WEBSITE_ID are required to read the recorded page view",
          );
        }
        if (umamiError) {
          throw new Error(`Umami API access failed: ${umamiError}`);
        }
        const count = await waitForNewPageView(
          config,
          umamiToken,
          "/",
          baseline,
        );
        if (count <= baseline) {
          throw new Error(
            `Umami recorded no new page view for / (still ${count} in the last 15 minutes)`,
          );
        }
        results.push({
          id: "deployed.analytics-pageview",
          status: STATUS.PASS,
          detail: `Umami recorded the gate's production page view for / (${baseline} -> ${count} views in the last 15 minutes)`,
        });
      } catch (error) {
        results.push({
          id: "deployed.analytics-pageview",
          status: isSkip(error) ? STATUS.SKIP : STATUS.FAIL,
          detail:
            error instanceof Error ? error.message : "page-view check failed",
        });
      }

      return results;
    });
  },
};

const recordedPrivacy = {
  id: "deployed.analytics-recorded-privacy",
  phase: "deployed",
  core: true,
  required: (config) => Boolean(config.baseUrl && config.umami),
  skipNote:
    "RELEASE_BASE_URL and the Umami API credentials are required to scan recorded analytics",
  async run(config) {
    const token = await umamiLogin(config);
    const metrics = await urlMetrics(config, token);
    const urlFindings = findSensitiveValues(metrics.map((metric) => metric.x));
    if (urlFindings.length > 0) {
      throw new Error(
        `Umami recorded a sensitive URL: ${formatFindings(urlFindings)}`,
      );
    }

    let eventNote = "";
    try {
      const eventFindings = await recordedEventFindings(config, token);
      if (eventFindings.length > 0) {
        throw new Error(
          `Umami recorded sensitive event data: ${formatFindings(eventFindings)}`,
        );
      }
      eventNote = "; recorded event data carries no sensitive values";
    } catch (error) {
      if (!isSkip(error)) {
        throw error;
      }
      eventNote = `; ${error.message}`;
    }

    return `Umami's recorded URLs in the last 15 minutes carry no emails, tokens, credentials, or secret query parameters (${metrics.length} URL group(s))${eventNote}`;
  },
};

const telemetryOutage = {
  id: "deployed.telemetry-outage",
  phase: "deployed",
  core: true,
  required: (config) => Boolean(config.baseUrl),
  skipNote: SKIP_NOTE,
  async run(config) {
    return withBrowser(async (browser) => {
      const context = await newContext(browser, config.baseUrl, {
        blockAnalytics: true,
      });
      const page = await context.newPage();
      try {
        const home = await page.goto("/", { waitUntil: "domcontentloaded" });
        if (!home || home.status() !== 200) {
          throw new Error(
            `the home page returned HTTP ${home?.status() ?? "none"} with telemetry unreachable`,
          );
        }
        await page
          .getByRole("heading", { name: "Dominate the Albion Black Market" })
          .waitFor();

        const health = await httpFetch(new URL("/api/health", config.baseUrl));
        assertStatus(health, 200, "health with telemetry unreachable");
        await textOf(health);

        const login = await page.goto("/log-in", {
          waitUntil: "domcontentloaded",
        });
        if (!login || login.status() !== 200) {
          throw new Error(
            `the login page returned HTTP ${login?.status() ?? "none"} with telemetry unreachable`,
          );
        }
        await page.locator('input[type="email"]').waitFor();
      } finally {
        await context.close();
      }

      return "with the Umami script and beacons blocked, the home page, login form, and health endpoint still work: a telemetry outage is not a process failure";
    });
  },
};

const umamiSurface = {
  id: "deployed.umami-surface",
  phase: "deployed",
  core: true,
  required: (config) => Boolean(config.umami),
  skipNote:
    "UMAMI_URL / UMAMI_USERNAME / UMAMI_PASSWORD / UMAMI_WEBSITE_ID are required to check the Umami operator surface",
  async run(config) {
    const loginPage = await httpFetch(new URL("/", config.umami.url), {
      headers: { accept: "text/html" },
    });
    assertStatus(loginPage, 200, "Umami login page");
    if (
      (loginPage.headers.get("www-authenticate") ?? "")
        .toLowerCase()
        .includes("basic")
    ) {
      throw new Error(
        "the Umami host answers with a reverse-proxy basic-auth challenge, which breaks the dashboard's bearer tokens",
      );
    }
    if (!(loginPage.headers.get("content-type") ?? "").includes("text/html")) {
      throw new Error("the Umami host did not return its login page");
    }

    const script = await httpFetch(new URL("/script.js", config.umami.url));
    assertStatus(script, 200, "Umami tracker script");
    if (
      !(script.headers.get("content-type") ?? "")
        .toLowerCase()
        .includes("javascript")
    ) {
      throw new Error("the Umami tracker script is not served as JavaScript");
    }

    const token = await umamiLogin(config);
    const websites = await umamiGet(config, token, "/api/websites");
    assertStatus(websites, 200, "Umami websites API");
    const payload = await websites.json();
    const websitesList = Array.isArray(payload) ? payload : payload?.data;
    const ids = Array.isArray(websitesList)
      ? websitesList.map((website) => website?.id)
      : [];
    if (!ids.includes(config.umami.websiteId)) {
      throw new Error(
        "the configured Umami website identifier is not visible to the operator account",
      );
    }

    return "the Umami host serves its login page and public tracker script, and the operator API reaches the configured website";
  },
};

module.exports = {
  checks: [tracker, umamiSurface, analytics, recordedPrivacy, telemetryOutage],
};
