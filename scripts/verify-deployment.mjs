import siteUrlPolicy from "../site-url-policy.js";

const { CANONICAL_SITE_URL, parseSiteUrl } = siteUrlPolicy;
const transportBaseUrl =
  process.env.DEPLOYMENT_BASE_URL?.trim() || CANONICAL_SITE_URL;
const ROUTES = {
  health: { path: "/api/health", accept: "application/json" },
  home: { path: "/", accept: "text/html" },
  documentation: { path: "/documentation", accept: "text/html" },
  manifest: {
    path: "/manifest.webmanifest",
    accept: "application/manifest+json",
  },
  robots: { path: "/robots.txt", accept: "text/plain" },
  sitemap: { path: "/sitemap.xml", accept: "application/xml" },
};

function parseBaseUrl(value) {
  const url = parseSiteUrl(value);
  if (!url) {
    throw new Error(
      "DEPLOYMENT_BASE_URL must be an http(s) origin without credentials, query, or hash",
    );
  }

  return url;
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

function getAttribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
}

function assertMetaContent(label, body, attribute, key, expectedValue) {
  const values = [...body.matchAll(/<meta\b[^>]*>/gi)].flatMap(([tag]) => {
    if (getAttribute(tag, attribute) !== key) {
      return [];
    }

    const content = getAttribute(tag, "content");
    return content ? [content] : [];
  });

  if (values.length !== 1 || values[0] !== expectedValue) {
    throw new Error(`${label} did not expose the expected metadata value`);
  }
}

function assertSoftwareApplicationUrl(body, expectedUrl) {
  const decodedBody = body.replace(/\\+"/g, '"');
  const urls = [
    ...decodedBody.matchAll(
      /"@type"\s*:\s*"SoftwareApplication"[\s\S]*?"url"\s*:\s*"([^"]+)"/g,
    ),
  ].map(([, url]) => url);

  if (urls.length !== 1 || urls[0] !== expectedUrl) {
    throw new Error("home did not expose the expected JSON-LD URL");
  }
}

async function fetchRoute(baseUrl, routeName) {
  const route = ROUTES[routeName];
  const requestedUrl = new URL(route.path, baseUrl);
  let response;
  try {
    response = await fetch(requestedUrl, {
      headers: { Accept: route.accept },
      redirect: "manual",
    });
  } catch {
    throw new Error(`${routeName} could not be fetched`);
  }

  if (response.status !== 200) {
    throw new Error(
      `${routeName} returned HTTP ${response.status}, expected 200`,
    );
  }

  if (new URL(response.url).origin !== baseUrl.origin) {
    throw new Error(`${routeName} redirected to another origin`);
  }

  return response;
}

async function main() {
  const baseUrl = parseBaseUrl(transportBaseUrl);
  const health = await fetchRoute(baseUrl, "health");
  const healthBody = await health.json();
  if (JSON.stringify(healthBody) !== JSON.stringify({ status: "ok" })) {
    throw new Error("health returned an unexpected response");
  }
  if (health.headers.get("cache-control") !== "no-store") {
    throw new Error("health did not return Cache-Control: no-store");
  }
  console.log("PASS health");

  const home = await fetchRoute(baseUrl, "home");
  const homeBody = await home.text();
  assertCanonicalLink("home", homeBody, CANONICAL_SITE_URL);
  assertMetaContent(
    "home Open Graph",
    homeBody,
    "property",
    "og:url",
    CANONICAL_SITE_URL,
  );
  assertMetaContent(
    "home Twitter",
    homeBody,
    "name",
    "twitter:image",
    `${CANONICAL_SITE_URL}/opengraph-image`,
  );
  assertSoftwareApplicationUrl(homeBody, CANONICAL_SITE_URL);
  console.log("PASS home");

  const documentation = await fetchRoute(baseUrl, "documentation");
  const documentationBody = await documentation.text();
  assertCanonicalLink(
    "documentation",
    documentationBody,
    `${CANONICAL_SITE_URL}/documentation`,
  );
  console.log("PASS documentation");

  const manifest = await fetchRoute(baseUrl, "manifest");
  const manifestBody = await manifest.json();
  if (manifestBody.start_url !== CANONICAL_SITE_URL) {
    throw new Error("manifest did not use the canonical site URL");
  }
  console.log("PASS manifest");

  const robots = await fetchRoute(baseUrl, "robots");
  const robotsBody = await robots.text();
  assertIncludes(
    "robots",
    robotsBody,
    `Sitemap: ${CANONICAL_SITE_URL}/sitemap.xml`,
  );
  assertIncludes("robots", robotsBody, `Host: ${CANONICAL_SITE_URL}`);
  console.log("PASS robots");

  const sitemap = await fetchRoute(baseUrl, "sitemap");
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
