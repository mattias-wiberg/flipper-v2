// Local release-gate evidence: install, typecheck, tests, production build,
// and (opt-in) container startup on the candidate checkout.
//
// `RELEASE_GATE_LOCAL=1` selects this phase. `npm ci` and the container build
// are separately opt-in because they rewrite node_modules and run Docker; when
// they are not enabled they are recorded as SKIP with the exact command, never
// silently omitted.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { skip } = require("../skip.js");
const { httpFetch, assertStatus } = require("../http.js");
const { REPO_ROOT, run, runNode } = require("../process.js");

const HEALTH_TIMEOUT_MS = 60_000;

function localBin(...segments) {
  const binary = path.join(REPO_ROOT, "node_modules", ...segments);
  if (!fs.existsSync(binary)) {
    throw new Error(
      `node_modules/${segments.join("/")} is missing; run npm ci first`,
    );
  }
  return binary;
}

async function runNodeScript(segments, args, options) {
  return runNode([localBin(...segments), ...args], options);
}

const install = {
  id: "local.install",
  phase: "local",
  core: true,
  optional: true,
  required: (config) => config.local.install,
  async run() {
    const npmCli = process.env.npm_execpath;
    if (!npmCli || !fs.existsSync(npmCli)) {
      throw new Error(
        "run the gate through `npm run gate:release` so `npm ci` can use the repository's npm",
      );
    }
    const result = await run(process.execPath, [npmCli, "ci"], {
      timeoutMs: 900_000,
    });
    if (result.code !== 0) {
      throw new Error("npm ci failed");
    }
    return "npm ci installed the committed lockfile without errors";
  },
  skipNote:
    "RELEASE_GATE_INSTALL is not set; run the gate on a disposable checkout with RELEASE_GATE_INSTALL=1 to record a clean install, because npm ci rewrites node_modules",
};

const typecheck = {
  id: "local.typecheck",
  phase: "local",
  core: true,
  async run() {
    const result = await runNodeScript(
      ["typescript", "bin", "tsc"],
      ["--noEmit"],
    );
    if (result.code !== 0) {
      throw new Error("TypeScript reported errors (npx tsc --noEmit)");
    }
    return "tsc --noEmit passed";
  },
};

function readBaseline() {
  const file = path.join(__dirname, "..", "jest-baseline.json");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const tests = {
  id: "local.tests",
  phase: "local",
  core: true,
  async run() {
    const outputFile = path.join(
      os.tmpdir(),
      `flipper-gate-jest-${process.pid}.json`,
    );
    const result = await runNodeScript(
      ["jest", "bin", "jest.js"],
      ["--runInBand", "--json", `--outputFile=${outputFile}`],
      { timeoutMs: 900_000 },
    );

    let report;
    try {
      report = JSON.parse(fs.readFileSync(outputFile, "utf8"));
    } catch {
      throw new Error("Jest did not produce a readable result file");
    } finally {
      fs.rmSync(outputFile, { force: true });
    }

    const baseline = readBaseline();
    const known = new Set(baseline.knownFailures ?? []);
    const failing = report.testResults.flatMap((suite) =>
      suite.assertionResults
        .filter((test) => test.status === "failed")
        .map((test) => test.fullName),
    );

    const unexpected = failing.filter((name) => !known.has(name));
    if (unexpected.length > 0) {
      throw new Error(
        `Jest failed ${unexpected.length} test(s) outside the documented baseline: ${unexpected
          .slice(0, 5)
          .join("; ")}`,
      );
    }

    if (result.code !== 0 && unexpected.length === 0 && failing.length === 0) {
      throw new Error("Jest exited non-zero without a recorded failure");
    }

    const baselineNote =
      failing.length > 0
        ? `; ${failing.length} documented baseline failure(s) kept separate: ${failing.join("; ")}`
        : "";
    const staleNote = [...known].some((name) => !failing.includes(name))
      ? "; the documented baseline lists failures that now pass (update jest-baseline.json)"
      : "";

    return `${report.numPassedTests} tests passed in ${report.numTotalTestSuites} suites${baselineNote}${staleNote}`;
  },
};

const build = {
  id: "local.build",
  phase: "local",
  core: true,
  async run(config) {
    // The public Supabase values are read while prerendering the shared layout.
    // They are placeholders only when the operator's environment does not carry
    // the project values; the deployed checks, not the local build, prove the
    // real project. No secret is needed or added here.
    const result = await runNodeScript(
      ["next", "dist", "bin", "next"],
      ["build"],
      {
        timeoutMs: 1_500_000,
        env: {
          ...process.env,
          NEXT_PUBLIC_SITE_URL: config.expectedSiteUrl,
          NEXT_PUBLIC_SUPABASE_URL:
            process.env.NEXT_PUBLIC_SUPABASE_URL ||
            "https://build-placeholder.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY:
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "build-placeholder",
          NEXT_TELEMETRY_DISABLED: "1",
        },
      },
    );
    if (result.code !== 0) {
      throw new Error("next build failed");
    }
    return `production build passed with NEXT_PUBLIC_SITE_URL=${config.expectedSiteUrl}`;
  },
};

const container = {
  id: "local.container",
  phase: "local",
  core: true,
  optional: true,
  required: (config) => config.container,
  async run(config) {
    const entrypoint = path.join(REPO_ROOT, "docker-entrypoint.sh");
    if (fs.readFileSync(entrypoint, "utf8").includes("\r\n")) {
      throw skip(
        "docker-entrypoint.sh has CRLF line endings in this checkout; re-checkout with the .gitattributes eol=lf setting to run the container check",
      );
    }

    const docker = await run(
      "docker",
      ["version", "--format", "{{.Server.Version}}"],
      {
        timeoutMs: 30_000,
      },
    ).catch(() => null);
    if (!docker || docker.code !== 0) {
      throw skip(
        "the Docker CLI is not available; container startup evidence was not recorded on this machine",
      );
    }

    const tag = `flipper-release-gate:${process.pid}`;
    const name = `flipper-release-gate-${process.pid}`;
    const buildResult = await run(
      "docker",
      [
        "build",
        "--tag",
        tag,
        "--build-arg",
        `NEXT_PUBLIC_SITE_URL=${config.expectedSiteUrl}`,
        "--build-arg",
        "NEXT_PUBLIC_SUPABASE_URL=https://gate-placeholder.supabase.co",
        "--build-arg",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY=gate-placeholder",
        REPO_ROOT,
      ],
      {
        timeoutMs: 1_800_000,
      },
    );
    if (buildResult.code !== 0) {
      throw new Error("docker build failed");
    }

    try {
      // A fixed random high port keeps the check free of `docker port` parsing;
      // a collision is reported as a retryable start failure.
      const hostPort = 31000 + (process.pid % 2000);
      const runResult = await run("docker", [
        "run",
        "--detach",
        "--rm",
        "--name",
        name,
        "--publish",
        `127.0.0.1:${hostPort}:3000`,
        // Dokploy supplies the public values as runtime variables too, and
        // startup validation requires them; pass the same placeholders used for
        // the build so the check mirrors the deployment contract.
        "--env",
        `NEXT_PUBLIC_SITE_URL=${config.expectedSiteUrl}`,
        "--env",
        "NEXT_PUBLIC_SUPABASE_URL=https://gate-placeholder.supabase.co",
        "--env",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY=gate-placeholder",
        "--env",
        "SUPABASE_SERVICE_ROLE_KEY=gate-placeholder",
        tag,
      ]);
      if (runResult.code !== 0) {
        throw new Error(
          "the production container did not start (the local port may be in use; retry)",
        );
      }

      const deadline = Date.now() + HEALTH_TIMEOUT_MS;
      let lastError = null;
      let healthy = false;
      while (!healthy && Date.now() < deadline) {
        try {
          const response = await httpFetch(
            `http://127.0.0.1:${hostPort}/api/health`,
            {},
            5_000,
          );
          assertStatus(response, 200, "container health");
          const body = await response.json();
          if (JSON.stringify(body) !== JSON.stringify({ status: "ok" })) {
            throw new Error("container health returned an unexpected response");
          }
          if (response.headers.get("cache-control") !== "no-store") {
            throw new Error(
              "container health did not return Cache-Control: no-store",
            );
          }
          healthy = true;
        } catch (error) {
          lastError = error;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (!healthy) {
        const state = await run("docker", [
          "inspect",
          "--format",
          "{{.State.Status}}",
          name,
        ])
          .then((result) => result.stdout.trim())
          .catch(() => "");
        throw new Error(
          `the production container never became healthy${
            state ? ` (container state: ${state})` : ""
          }: ${lastError?.message ?? "no response"}`,
        );
      }

      const user = await run("docker", [
        "inspect",
        "--format",
        "{{.Config.User}}",
        name,
      ]);
      const runtimeUser = user.stdout.trim();
      if (!runtimeUser || runtimeUser === "root" || runtimeUser === "0") {
        throw new Error("the production container does not run as non-root");
      }

      return `the production image built and served the health contract from a scratch container as ${runtimeUser}`;
    } finally {
      await run("docker", ["rm", "--force", name]).catch(() => {});
      await run("docker", ["image", "rm", "--force", tag]).catch(() => {});
    }
  },
  skipNote:
    "RELEASE_GATE_CONTAINER is not set; enable it (Docker required) to build and start the production image locally",
};

module.exports = { checks: [install, typecheck, tests, build, container] };
