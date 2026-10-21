// Small HTTP helpers. Errors name the request and the expectation only; no
// response body is echoed, so a diagnostic can never carry a credential or a
// market-order payload into the gate report.
const DEFAULT_TIMEOUT_MS = 30_000;

// UUID path segments are tokens in Flipper's ingestion route. Diagnostics keep
// the shape but never the value, so an unknown or real token cannot leak into a
// report.
function describePath(pathname) {
  return pathname.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi,
    "/<token>",
  );
}

async function httpFetch(url, init = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const target = url instanceof URL ? url : new URL(url);
  const method = init.method ?? "GET";
  try {
    return await fetch(target, {
      redirect: "manual",
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error?.name === "TimeoutError") {
      throw new Error(`${method} ${describePath(target.pathname)} timed out`);
    }
    throw new Error(
      `${method} ${describePath(target.pathname)} could not be reached`,
    );
  }
}

function assertStatus(response, expected, label) {
  const expectedList = Array.isArray(expected) ? expected : [expected];
  if (!expectedList.includes(response.status)) {
    throw new Error(
      `${label} returned HTTP ${response.status}, expected ${expectedList.join(
        " or ",
      )}`,
    );
  }
}

async function textOf(response, limit = 200) {
  return (await response.text()).slice(0, limit);
}

function assertBody(text, expected, label) {
  if (!text.includes(expected)) {
    throw new Error(`${label} did not return the expected response body`);
  }
}

module.exports = {
  assertBody,
  assertStatus,
  httpFetch,
  textOf,
};
