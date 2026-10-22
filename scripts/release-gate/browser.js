// Browser automation for the Auth and analytics checks.
//
// Playwright is a devDependency, and its Chromium build is installed
// separately (`npx playwright install chromium`). When either is missing the
// checks skip with the exact operator command instead of failing, so the gate
// still runs its HTTP checks on a machine without a browser.
const { skip } = require("./skip.js");

const ANALYTICS_ROUTES = [/\/script\.js(?:\?.*)?$/, /\/api\/send(?:\?.*)?$/];

// Umami drops views from bot-like user agents, and headless Chrome's default UA
// carries a `HeadlessChrome` token, so every gate context presents as desktop Chrome.
const DESKTOP_CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

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
    userAgent: DESKTOP_CHROME_UA,
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

module.exports = {
  ANALYTICS_ROUTES,
  launchBrowser,
  newContext,
  withBrowser,
};
