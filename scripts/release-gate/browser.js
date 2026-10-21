// Browser automation for the Auth and analytics checks.
//
// Playwright is a devDependency, and its Chromium build is installed
// separately (`npx playwright install chromium`). When either is missing the
// checks skip with the exact operator command instead of failing, so the gate
// still runs its HTTP checks on a machine without a browser.
const { skip } = require("./skip.js");

const ANALYTICS_ROUTES = [/\/script\.js(?:\?.*)?$/, /\/api\/send(?:\?.*)?$/];

async function launchBrowser() {
  let playwright;
  try {
    playwright = require("playwright");
  } catch {
    throw skip(
      "playwright is not installed; run `npm i -D playwright && npx playwright install chromium` to enable browser checks",
    );
  }

  try {
    return await playwright.chromium.launch({ headless: true });
  } catch {
    throw skip(
      "Playwright Chromium is not installed; run `npx playwright install chromium` to enable browser checks",
    );
  }
}

async function newContext(browser, baseUrl, { blockAnalytics = false } = {}) {
  const context = await browser.newContext({
    baseURL: baseUrl,
    ignoreHTTPSErrors: false,
  });
  context.setDefaultTimeout(30_000);
  context.setDefaultNavigationTimeout(60_000);

  if (blockAnalytics) {
    for (const route of ANALYTICS_ROUTES) {
      await context.route(route, (handler) => handler.abort());
    }
  }

  return context;
}

async function withBrowser(run) {
  const browser = await launchBrowser();
  try {
    return await run(browser);
  } finally {
    await browser.close().catch(() => {});
  }
}

/**
 * Load a path and follow redirects. Returns the response; callers assert the
 * final URL. Non-2xx responses are returned, not thrown, so a check can report
 * the deployed behaviour it observed.
 */
async function navigate(page, path) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  return { response, status: response?.status() ?? null };
}

function pathOf(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}

module.exports = {
  ANALYTICS_ROUTES,
  launchBrowser,
  navigate,
  newContext,
  pathOf,
  withBrowser,
};
