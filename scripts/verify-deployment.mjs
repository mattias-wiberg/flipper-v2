import siteUrlPolicy from "../site-url-policy.js";

const { CANONICAL_SITE_URL } = siteUrlPolicy;
const transportBaseUrl =
  process.env.DEPLOYMENT_BASE_URL?.trim() || CANONICAL_SITE_URL;

function parseBaseUrl(value) {
  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.pathname !== "/" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error();
    }

    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url;
  } catch {
    throw new Error(
      "DEPLOYMENT_BASE_URL must be an http(s) origin without credentials, query, or hash",
    );
  }
}

function assertIncludes(label, body, value) {
  if (!body.includes(value)) {
    throw new Error(
      `${label} did not contain the expected canonical reference`,
    );
  }
}

function assertCanonicalLink(label, body, expectedUrl) {
  const canonicalLinks = [...body.matchAll(/<link\b[^>]*>/gi)].flatMap(
    ([tag]) => {
      const rel = tag.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1];
      const href = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
      return rel?.split(/\s+/).includes("canonical") && href ? [href] : [];
    },
  );

  if (canonicalLinks.length !== 1 || canonicalLinks[0] !== expectedUrl) {
    throw new Error(`${label} did not expose the expected canonical link`);
  }
}

async function fetchRoute(baseUrl, route) {
  let response;
  try {
    response = await fetch(new URL(route.path, baseUrl), {
      headers: { Accept: route.accept },
      redirect: "follow",
    });
  } catch {
    throw new Error(`${route.name} could not be fetched`);
  }

  if (response.status !== 200) {
    throw new Error(
      `${route.name} returned HTTP ${response.status}, expected 200`,
    );
  }

  if (new URL(response.url).origin !== baseUrl.origin) {
    throw new Error(`${route.name} redirected to another origin`);
  }

  return response;
}

async function main() {
  const baseUrl = parseBaseUrl(transportBaseUrl);
  const health = await fetchRoute(baseUrl, {
    name: "health",
    path: "/api/health",
    accept: "application/json",
  });
  const healthBody = await health.json();
  if (JSON.stringify(healthBody) !== JSON.stringify({ status: "ok" })) {
    throw new Error("health returned an unexpected response");
  }
  if (health.headers.get("cache-control") !== "no-store") {
    throw new Error("health did not return Cache-Control: no-store");
  }
  console.log("PASS health");

  const home = await fetchRoute(baseUrl, {
    name: "home",
    path: "/",
    accept: "text/html",
  });
  const homeBody = await home.text();
  assertCanonicalLink("home", homeBody, CANONICAL_SITE_URL);
  console.log("PASS home");

  const documentation = await fetchRoute(baseUrl, {
    name: "documentation",
    path: "/documentation",
    accept: "text/html",
  });
  const documentationBody = await documentation.text();
  assertCanonicalLink(
    "documentation",
    documentationBody,
    `${CANONICAL_SITE_URL}/documentation`,
  );
  console.log("PASS documentation");

  const manifest = await fetchRoute(baseUrl, {
    name: "manifest",
    path: "/manifest.webmanifest",
    accept: "application/manifest+json",
  });
  const manifestBody = await manifest.json();
  if (manifestBody.start_url !== CANONICAL_SITE_URL) {
    throw new Error("manifest did not use the canonical site URL");
  }
  console.log("PASS manifest");

  const robots = await fetchRoute(baseUrl, {
    name: "robots",
    path: "/robots.txt",
    accept: "text/plain",
  });
  const robotsBody = await robots.text();
  assertIncludes(
    "robots",
    robotsBody,
    `Sitemap: ${CANONICAL_SITE_URL}/sitemap.xml`,
  );
  assertIncludes("robots", robotsBody, `Host: ${CANONICAL_SITE_URL}`);
  console.log("PASS robots");

  const sitemap = await fetchRoute(baseUrl, {
    name: "sitemap",
    path: "/sitemap.xml",
    accept: "application/xml",
  });
  const sitemapBody = await sitemap.text();
  assertIncludes("sitemap", sitemapBody, `<loc>${CANONICAL_SITE_URL}/</loc>`);
  assertIncludes(
    "sitemap",
    sitemapBody,
    `<loc>${CANONICAL_SITE_URL}/documentation</loc>`,
  );
  console.log("PASS sitemap");

  console.log("Deployment verification passed");
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Deployment verification failed",
  );
  process.exitCode = 1;
});
