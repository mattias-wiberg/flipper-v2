import boundary from "./deployment-boundary.js";
import siteUrlPolicy from "../site-url-policy.js";

const {
  BOUNDARY_CHECKS,
  parseBaseUrl,
  parseExpectedSiteUrl,
  verifyPublicBoundary,
} = boundary;
const { CANONICAL_SITE_URL } = siteUrlPolicy;

// EXPECTED_SITE_URL asserts the canonical origin of the deployment under test.
// It defaults to the configured public origin (site-url.config.json) and can be
// overridden when verifying a deployment that is intentionally built for a
// different origin. DEPLOYMENT_BASE_URL stays a transport-only override (for
// local container checks) and never changes the expected canonical content.
const expectedSiteUrlValue =
  process.env.EXPECTED_SITE_URL?.trim() || CANONICAL_SITE_URL;
const transportBaseUrlValue =
  process.env.DEPLOYMENT_BASE_URL?.trim() || expectedSiteUrlValue;

async function main() {
  const expectedSiteUrl = parseExpectedSiteUrl(expectedSiteUrlValue);
  const baseUrl = parseBaseUrl(transportBaseUrlValue);

  // Report route by route and stop at the first failure, so the exit message
  // stays the same single diagnostic this CLI has always printed.
  for (const name of BOUNDARY_CHECKS) {
    const [result] = await verifyPublicBoundary({
      baseUrl,
      expectedSiteUrl,
      checks: [name],
    });
    if (!result.ok) {
      throw new Error(result.message);
    }
    console.log(`PASS ${name}`);
  }

  console.log("Deployment verification passed");
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Deployment verification failed",
  );
  process.exitCode = 1;
});
