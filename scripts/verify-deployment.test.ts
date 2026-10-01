import { spawn } from "node:child_process";
import { createServer, type Server } from "node:http";
import path from "node:path";

const CANONICAL_SITE_URL = "https://flipper.mattiaswiberg.com";

function runVerifier(baseUrl: string) {
  const child = spawn(
    process.execPath,
    [path.resolve(process.cwd(), "scripts/verify-deployment.mjs")],
    {
      env: { ...process.env, DEPLOYMENT_BASE_URL: baseUrl },
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

function softwareApplicationJsonLd() {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Flipper",
    url: CANONICAL_SITE_URL,
  });
}

function homeHtml(options: { jsonLdInScriptTag: boolean }) {
  const jsonLd = options.jsonLdInScriptTag
    ? `<script type="application/ld+json">${softwareApplicationJsonLd()}</script>`
    : `<script>self.__next_f.push(${JSON.stringify(
        softwareApplicationJsonLd().replace(/"/g, '\\"'),
      )})</script>`;

  return `<!doctype html><html><head>
    <link rel="canonical" href="${CANONICAL_SITE_URL}" />
    <meta property="og:url" content="${CANONICAL_SITE_URL}" />
    <meta name="twitter:image" content="${CANONICAL_SITE_URL}/opengraph-image" />
    </head><body>${jsonLd}</body></html>`;
}

function compliantOrigin(options: { jsonLdInScriptTag: boolean }): Server {
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
        response.end(homeHtml(options));
        return;
      case "/documentation":
        response.writeHead(200, { "content-type": "text/html" });
        response.end(
          `<!doctype html><html><head><link rel="canonical" href="${CANONICAL_SITE_URL}/documentation" /></head><body></body></html>`,
        );
        return;
      case "/manifest.webmanifest":
        response.writeHead(200, {
          "content-type": "application/manifest+json",
        });
        response.end(JSON.stringify({ start_url: CANONICAL_SITE_URL }));
        return;
      case "/robots.txt":
        response.writeHead(200, { "content-type": "text/plain" });
        response.end(
          `User-agent: *\nHost: ${CANONICAL_SITE_URL}\nSitemap: ${CANONICAL_SITE_URL}/sitemap.xml\n`,
        );
        return;
      case "/sitemap.xml":
        response.writeHead(200, { "content-type": "application/xml" });
        response.end(
          `<?xml version="1.0" encoding="UTF-8"?><urlset><url><loc>${CANONICAL_SITE_URL}/</loc></url><url><loc>${CANONICAL_SITE_URL}/documentation</loc></url></urlset>`,
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
        Location: "https://flipper.mattiaswiberg.com/",
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

  it("passes against a compliant origin", async () => {
    const server = compliantOrigin({ jsonLdInScriptTag: true });
    const baseUrl = await listen(server);

    try {
      const result = await runVerifier(baseUrl);
      expect(result.code).toBe(0);
    } finally {
      await close(server);
    }
  });

  it("rejects JSON-LD that is not in the server-rendered HTML", async () => {
    const server = compliantOrigin({ jsonLdInScriptTag: false });
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
});
