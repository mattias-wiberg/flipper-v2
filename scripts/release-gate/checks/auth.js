// Black-box Auth lifecycle against the deployed service.
//
// One browser session drives the real forms: sign-in with the controlled
// account, an expired-access-token refresh through the deployed session proxy,
// sign-out, and a password-reset request. No Supabase Auth internals are
// mocked. Email delivery is the only skipped step: without a mailbox adapter
// the gate states that plainly instead of claiming it.
const { newContext, withBrowser } = require("../browser.js");
const { STATUS } = require("../report.js");
const session = require("../session.js");
const { isSkip, skip } = require("../skip.js");

const SIGNED_IN = '[aria-label="Open account menu"]';

function authCookies(cookies) {
  return cookies.filter(({ name }) =>
    /^sb-[A-Za-z0-9_-]+-auth-token(?:\.\d+)?$/.test(name),
  );
}

// The account-menu trigger is not present in the redirect's first render, so
// the protected page's heading plus the session cookie prove the signed-in state.
async function assertSignedIn(context, page) {
  await page.getByRole("heading", { name: /Welcome back/ }).waitFor();
  if (authCookies(await context.cookies()).length === 0) {
    throw new Error(
      "the protected page rendered without a Supabase auth cookie, so the browser is not signed in",
    );
  }
}

async function signIn(context, page, credentials) {
  await page.goto("/log-in", { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').fill(credentials.email);
  await page.locator('input[type="password"]').fill(credentials.password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname === "/authenticated/deals", {
    timeout: 60_000,
  });
  await assertSignedIn(context, page);
  // The redirect's first render omits the account menu until a fresh render,
  // so reload before the later steps use it.
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(SIGNED_IN).waitFor({ state: "visible" });
}

async function waitForNoAuthCookie(context, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const cookies = authCookies(await context.cookies());
    if (cookies.length === 0) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function refreshExpiredSession(context, page) {
  const cookies = await context.cookies();
  const stored = session.readSessionCookie(cookies);
  if (!stored) {
    throw skip(
      "the deployed sign-in left no readable Supabase session cookie, so the expired-session refresh could not be exercised",
    );
  }

  const source = session.findSessionCookie(cookies, stored.name);
  if (!source) {
    throw new Error(
      "the deployed session cookie disappeared before the refresh check",
    );
  }
  const aged = session.ageSession(stored.session);
  const chunks = session.encodeSessionCookies(stored.name, aged);
  const attributes = {
    domain: source.domain,
    path: source.path || "/",
    httpOnly: source.httpOnly,
    secure: source.secure,
    sameSite: source.sameSite,
  };

  for (const cookie of authCookies(cookies)) {
    await context.clearCookies({ name: cookie.name });
  }
  await context.addCookies(
    chunks.map((chunk) => ({ ...chunk, ...attributes })),
  );

  const expiredAt = session.accessTokenExpiry(aged);
  const response = await page.goto("/authenticated/deals", {
    waitUntil: "domcontentloaded",
  });
  if (new URL(page.url()).pathname !== "/authenticated/deals") {
    throw new Error(
      "the deployed session proxy did not refresh an expired access token",
    );
  }
  if (!response || response.status() !== 200) {
    throw new Error(
      `the protected page returned HTTP ${response?.status() ?? "none"} after an expired access token`,
    );
  }
  await assertSignedIn(context, page);

  const refreshed = session.readSessionCookie(await context.cookies());
  const refreshedAt = refreshed
    ? session.accessTokenExpiry(refreshed.session)
    : null;
  if (refreshedAt === null || refreshedAt <= expiredAt) {
    throw new Error(
      "the deployed session proxy did not write a refreshed session cookie",
    );
  }

  return "the deployed proxy refreshed an expired access token and the protected page still rendered";
}

async function signOut(page, context) {
  await page.locator(SIGNED_IN).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await page.waitForURL((url) => url.pathname === "/log-in", {
    timeout: 30_000,
  });
  if (!(await waitForNoAuthCookie(context))) {
    throw new Error("sign-out left the session cookie in the browser");
  }
}

async function requestPasswordReset(context, email) {
  const page = await context.newPage();
  try {
    await page.goto("/forgot-password", { waitUntil: "domcontentloaded" });
    await page.locator('input[type="email"]').fill(email);
    await page.locator('form button[type="submit"]').click();
    const status = page.locator('[role="status"]');
    await status.waitFor({ state: "visible", timeout: 30_000 });
    const text = (await status.textContent()) ?? "";
    if (!text.includes("Check your email")) {
      throw new Error(
        "the password-reset request did not render its success state",
      );
    }
  } finally {
    await page.close();
  }

  return "the deployed forgot-password form accepted the controlled account's reset request";
}

const auth = {
  id: "deployed.auth-lifecycle",
  phase: "deployed",
  core: true,
  required: (config) => Boolean(config.baseUrl && config.auth),
  skipNote:
    "RELEASE_BASE_URL and the controlled account (SMOKE_EMAIL / SMOKE_PASSWORD) are required for Auth checks",
  async run(config) {
    return withBrowser(async (browser) => {
      const results = [];
      const context = await newContext(browser, config.baseUrl);
      const page = await context.newPage();

      const steps = [
        {
          id: "deployed.auth-signin",
          async run() {
            await signIn(context, page, config.auth);
            return "the controlled account signed in through the deployed form and reached /authenticated/deals with a Supabase session cookie";
          },
        },
        {
          id: "deployed.session-refresh",
          async run() {
            return refreshExpiredSession(context, page);
          },
        },
        {
          id: "deployed.auth-signout",
          async run() {
            await signOut(page, context);
            return "sign-out cleared the session and returned to /log-in";
          },
        },
        {
          id: "deployed.password-reset",
          async run() {
            return requestPasswordReset(context, config.auth.email);
          },
        },
      ];

      try {
        for (let index = 0; index < steps.length; index += 1) {
          const step = steps[index];
          try {
            results.push({
              id: step.id,
              status: STATUS.PASS,
              detail: await step.run(),
            });
          } catch (error) {
            results.push({
              id: step.id,
              status: isSkip(error) ? STATUS.SKIP : STATUS.FAIL,
              detail:
                error instanceof Error ? error.message : "Auth step failed",
            });
            for (const remaining of steps.slice(index + 1)) {
              results.push({
                id: remaining.id,
                status: STATUS.SKIP,
                detail: "not attempted after an earlier Auth step did not pass",
              });
            }
            break;
          }
        }
      } finally {
        await context.close();
      }

      results.push({
        id: "deployed.password-reset-email",
        core: false,
        status: STATUS.SKIP,
        detail:
          "email delivery is operator-gated: no mailbox adapter is configured, so confirm the reset message and its callback origin in the controlled inbox",
      });

      return results;
    });
  },
};

module.exports = { checks: [auth] };
