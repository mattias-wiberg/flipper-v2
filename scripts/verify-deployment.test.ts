import { spawn } from "node:child_process";
import { createServer, type Server } from "node:http";
import path from "node:path";

import { CANONICAL_SITE_URL } from "../site-url-policy.js";

const APEX_SITE_URL = "https://flipper.mattiaswiberg.com";

function runVerifier(
  baseUrl: string,
  options: { expectedSiteUrl?: string } = {},
) {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DEPLOYMENT_BASE_URL: baseUrl,
  };
  delete env.EXPECTED_SITE_URL;
  if (options.expectedSiteUrl !== undefined) {
    env.EXPECTED_SITE_URL = options.expectedSiteUrl;
  }

  const child = spawn(
    process.execPath,
    [path.resolve(process.cwd(), "scripts/verify-deployment.mjs")],
    {
      env,
      stdio: ["ignore", "ignore", "pipe"],
    },
  );
  let stderr = "";
  child.stderr?.setEncoding("utf8");
  child.stderr?.on("data", (chunk: string) => {
    stderr += chunk;
  });

  return new Promise<{ code: number | null; stderr: string }>(
    (resolve, reject) => {
      child.once("error", reject);
      child.once("close", (code) => resolve({ code, stderr }));
    },
  );
}

function softwareApplicationJsonLd(siteUrl: string) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Flipper",
    url: siteUrl,
  });
}

function homeHtml(siteUrl: string, options: { jsonLdInScriptTag: boolean }) {
  const jsonLd = options.jsonLdInScriptTag
    ? `<script type="application/ld+json">${softwareApplicationJsonLd(
        siteUrl,
      )}</script>`
    : `<script>self.__next_f.push(${JSON.stringify(
        softwareApplicationJsonLd(siteUrl).replace(/"/g, '\\"'),
      )})</script>`;

  return `<!doctype html><html><head>
    <link rel="canonical" href="${siteUrl}" />
    <meta property="og:url" content="${siteUrl}" />
    <meta name="twitter:image" content="${siteUrl}/opengraph-image" />
    </head><body>${jsonLd}</body></html>`;
}

function compliantOrigin(options: {
  jsonLdInScriptTag: boolean;
  siteUrl: string;
}): Server {
  return createServer((request, response) => {
    switch (request.url) {
      case "/api/health":
        response.writeHead(200, {
          "content-type": "application/json",
          "cache-control": "no-store",
        });
        response.end(JSON.stringify({ status: "ok" }));
        return;
      case "/":
        response.writeHead(200, { "content-type": "text/html" });
        response.end(homeHtml(options.siteUrl, options));
        return;
      case "/documentation":
        response.writeHead(200, { "content-type": "text/html" });
        response.end(
          `<!doctype html><html><head><link rel="canonical" href="${options.siteUrl}/documentation" /></head><body></body></html>`,
        );
        return;
      case "/manifest.webmanifest":
        response.writeHead(200, {
          "content-type": "application/manifest+json",
        });
        response.end(JSON.stringify({ start_url: options.siteUrl }));
        return;
      case "/robots.txt":
        response.writeHead(200, { "content-type": "text/plain" });
        response.end(
          `User-agent: *\nHost: ${options.siteUrl}\nSitemap: ${options.siteUrl}/sitemap.xml\n`,
        );
        return;
      case "/sitemap.xml":
        response.writeHead(200, { "content-type": "application/xml" });
        response.end(
          `<?xml version="1.0" encoding="UTF-8"?><urlset><url><loc>${options.siteUrl}/</loc></url><url><loc>${options.siteUrl}/documentation</loc></url></urlset>`,
        );
        return;
      default:
        response.writeHead(404);
        response.end();
    }
  });
}

async function listen(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("test server did not expose a port");
  }
  return `http://127.0.0.1:${address.port}`;
}

async function close(server: Server) {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

describe("deployment verifier", () => {
  it("rejects redirects instead of validating a followed response", async () => {
    const server = createServer((_request, response) => {
      response.writeHead(302, {
        Location: `${APEX_SITE_URL}/`,
      });
      response.end();
    });

    const baseUrl = await listen(server);

    try {
      const result = await runVerifier(baseUrl);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain("health returned HTTP 302, expected 200");
    } finally {
      await close(server);
    }
  });

  it("passes against a compliant origin for the configured site URL", async () => {
    const server = compliantOrigin({
      jsonLdInScriptTag: true,
      siteUrl: CANONICAL_SITE_URL,
    });
    const baseUrl = await listen(server);

    try {
      const result = await runVerifier(baseUrl);
      expect(result.code).toBe(0);
    } finally {
      await close(server);
    }
  });

  it("rejects JSON-LD that is not in the server-rendered HTML", async () => {
    const server = compliantOrigin({
      jsonLdInScriptTag: false,
      siteUrl: CANONICAL_SITE_URL,
    });
    const baseUrl = await listen(server);

    try {
      const result = await runVerifier(baseUrl);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain(
        "home did not expose the expected JSON-LD URL",
      );
    } finally {
      await close(server);
    }
  });

  it("asserts the configured site URL when EXPECTED_SITE_URL is not set", async () => {
    const server = compliantOrigin({
      jsonLdInScriptTag: true,
      siteUrl: APEX_SITE_URL,
    });
    const baseUrl = await listen(server);

    try {
      const result = await runVerifier(baseUrl);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain(
        "home did not expose the expected canonical link",
      );
    } finally {
      await close(server);
    }
  });

  it("honors an EXPECTED_SITE_URL override for the deployment under test", async () => {
    const alternateSiteUrl = "https://deployment.example.test";
    const server = compliantOrigin({
      jsonLdInScriptTag: true,
      siteUrl: alternateSiteUrl,
    });
    const baseUrl = await listen(server);

    try {
      const passing = await runVerifier(baseUrl, {
        expectedSiteUrl: alternateSiteUrl,
      });
      expect(passing.code).toBe(0);

      const failing = await runVerifier(baseUrl, {
        expectedSiteUrl: CANONICAL_SITE_URL,
      });
      expect(failing.code).toBe(1);
      expect(failing.stderr).toContain(
        "home did not expose the expected canonical link",
      );
    } finally {
      await close(server);
    }
  });

  it("rejects a credential-bearing EXPECTED_SITE_URL by name only", async () => {
    const siteSecret = "site-secret-for-test";
    const server = compliantOrigin({
      jsonLdInScriptTag: true,
      siteUrl: CANONICAL_SITE_URL,
    });
    const baseUrl = await listen(server);

    try {
      const result = await runVerifier(baseUrl, {
        expectedSiteUrl: `https://site-user:${siteSecret}@deployment.example.test`,
      });
      expect(result.code).toBe(1);
      expect(result.stderr).toContain("EXPECTED_SITE_URL");
      expect(result.stderr).not.toContain(siteSecret);
    } finally {
      await close(server);
    }
  });
});
