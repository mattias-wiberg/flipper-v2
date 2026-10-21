// Flipper release gate: one environment-gated, black-box proof that a candidate
// release is a known-good release.
//
//   npm run gate:release                    # deployed checks (needs RELEASE_BASE_URL)
//   RELEASE_GATE_LOCAL=1 npm run gate:release
//   npm run gate:release -- --phase local
//
// With no release environment configured every check is skipped and the gate
// exits 0 as a dry run. Once a target is configured, a failed required check or
// a skipped required check rejects the release and exits non-zero. See
// docs/release-gate.md for the environment matrix and what stays operator-gated.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import analyticsChecks from "./checks/analytics.js";
import authChecks from "./checks/auth.js";
import ingestionChecks from "./checks/ingestion.js";
import localChecks from "./checks/local.js";
import publicChecks from "./checks/public.js";
import configModule from "./config.js";
import processModule from "./process.js";
import reportModule from "./report.js";
import sensitive from "./sensitive.js";
import skipModule from "./skip.js";

const { parseGateConfig } = configModule;
const {
  STATUS,
  addResult,
  computeVerdict,
  createReport,
  formatResults,
  summarize,
  toJson,
} = reportModule;
const { redactSecrets, stripUrlSecrets } = sensitive;
const { isSkip } = skipModule;
const { REPO_ROOT } = processModule;

const PHASES = ["local", "deployed"];

const CHECKS = [
  ...localChecks.checks,
  ...publicChecks.checks,
  ...authChecks.checks,
  ...ingestionChecks.checks,
  ...analyticsChecks.checks,
];

function parseArguments(argv) {
  const options = { phase: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }
    if (argument === "--phase") {
      options.phase = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (argument.startsWith("--phase=")) {
      options.phase = argument.slice("--phase=".length);
      continue;
    }
    // npm 11 treats unknown `--flags` as its own configuration, so the
    // documented invocation passes the phase as a bare word:
    //   npm run gate:release -- local
    if (!argument.startsWith("-") && !options.phase) {
      options.phase = argument;
    }
  }
  return options;
}

function printHelp() {
  process.stdout.write(`Usage: npm run gate:release -- [local|deployed|all]

Phases (a bare word, or --phase <name> when the script is run directly):
  deployed   Black-box checks against RELEASE_BASE_URL (default when unset: skipped)
  local      npm ci, tsc, Jest, production build, and container startup
  all        Both phases

Environment:
  RELEASE_BASE_URL          Origin under test, for example https://beta.flipper.mattiaswiberg.com
  SMOKE_EMAIL               Controlled account for the Auth lifecycle
  SMOKE_PASSWORD            Controlled account password
  SMOKE_INGESTION_TOKEN     Dedicated ingestion token (v4 UUID) for the golden replay
  NEXT_PUBLIC_SUPABASE_URL  Existing Supabase project URL (read-only export + cleanup)
  SUPABASE_SERVICE_ROLE_KEY Service-role key for that export
  UMAMI_URL                 Umami origin, for example https://umami.mattiaswiberg.com
  UMAMI_USERNAME            Umami operator account
  UMAMI_PASSWORD            Umami operator password
  UMAMI_WEBSITE_ID          Flipper website identifier in Umami
  RELEASE_GATE_LOCAL=1      Select the local phase by default
  RELEASE_GATE_INSTALL=1    Record a clean npm ci (rewrites node_modules)
  RELEASE_GATE_CONTAINER=1  Record container startup and health (requires Docker)
  RELEASE_GATE_REPORT       Evidence path (default release-gate-report.json)

Secrets are read from the environment only and are never printed or written.
`);
}

function selectedPhases(options, config) {
  if (options.phase === "all") {
    return PHASES;
  }
  if (options.phase) {
    if (!PHASES.includes(options.phase)) {
      throw new Error(`phase must be one of ${PHASES.join(", ")} or all`);
    }
    return [options.phase];
  }
  return config.local.enabled ? PHASES : ["deployed"];
}

function candidateCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return 0;
  }

  const config = parseGateConfig(process.env);
  let phases;
  try {
    phases = selectedPhases(options, config);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }

  const report = createReport({
    baseUrl: config.baseUrl,
    expectedSiteUrl: config.expectedSiteUrl,
    commit: candidateCommit(),
  });

  const redact = (value) =>
    redactSecrets(stripUrlSecrets(value), config.secrets);

  process.stdout.write(
    `Release gate for ${config.baseUrl ?? "an unconfigured target"}\n`,
  );
  process.stdout.write(`Candidate commit: ${report.candidate.commit}\n`);
  process.stdout.write(`Phases: ${phases.join(", ")}\n`);
  for (const note of config.notes) {
    process.stdout.write(`Note: ${note}\n`);
  }

  if (config.errors.length > 0) {
    for (const error of config.errors) {
      addResult(report, {
        id: `config.${error.variable}`,
        phase: phases[0],
        core: true,
        status: STATUS.FAIL,
        detail: redact(error.message),
      });
    }
  }

  // A dry run: no target and no local phase requested. Nothing is contacted;
  // every check is reported as a skip and the run is not evidence of anything.
  const dryRun =
    !config.baseUrl && phases.length === 1 && phases[0] === "deployed";
  if (dryRun) {
    for (const check of CHECKS) {
      addResult(report, {
        id: check.id,
        phase: check.phase,
        core: false,
        status: STATUS.SKIP,
        detail: redact(
          check.phase === "deployed"
            ? "RELEASE_BASE_URL is not set: nothing was executed"
            : "local phase is not selected in this run",
        ),
      });
    }
  } else {
    for (const check of CHECKS) {
      if (!phases.includes(check.phase)) {
        addResult(report, {
          id: check.id,
          phase: check.phase,
          core: false,
          status: STATUS.SKIP,
          detail: `${check.phase} phase is not selected in this run`,
        });
        continue;
      }

      const required = check.required ? check.required(config) : true;
      if (!required) {
        addResult(report, {
          id: check.id,
          phase: check.phase,
          core: check.optional ? false : check.core,
          status: STATUS.SKIP,
          detail: redact(check.skipNote ?? "required configuration is absent"),
        });
        continue;
      }

      try {
        const outcome = await check.run(config);
        if (Array.isArray(outcome)) {
          for (const result of outcome) {
            addResult(report, {
              id: result.id,
              phase: check.phase,
              core: result.core ?? check.core,
              status: result.status,
              detail: redact(result.detail),
            });
          }
        } else {
          addResult(report, {
            id: check.id,
            phase: check.phase,
            core: check.core,
            status: STATUS.PASS,
            detail: redact(outcome),
          });
        }
      } catch (error) {
        addResult(report, {
          id: check.id,
          phase: check.phase,
          core: check.core,
          status: isSkip(error) ? STATUS.SKIP : STATUS.FAIL,
          detail: redact(
            error instanceof Error ? error.message : "the check failed",
          ),
        });
      }
    }
  }

  for (const line of formatResults(report.results, phases)) {
    process.stdout.write(`${line}\n`);
  }

  const verdict = computeVerdict(report.results, phases);
  const counts = summarize(
    report.results.filter((result) => phases.includes(result.phase)),
  );
  report.finishedAt = new Date().toISOString();

  const evidence = toJson(report, verdict, {
    command: `npm run gate:release${process.argv.length > 2 ? ` -- ${process.argv.slice(2).join(" ")}` : ""}`,
    phases,
    notes: config.notes,
  });
  try {
    const reportPath = path.resolve(process.cwd(), config.reportPath);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(
      reportPath,
      redact(JSON.stringify(evidence, null, 2)) + "\n",
      "utf8",
    );
    process.stdout.write(`Evidence: ${reportPath}\n`);
  } catch {
    process.stderr.write("Could not write the release-gate evidence file\n");
  }

  process.stdout.write(
    `\n${counts.passed} passed, ${counts.failed} failed, ${counts.skipped} skipped for the ${phases.join(
      " + ",
    )} phase(s)\n`,
  );
  process.stdout.write(
    `Release gate: ${verdict.verdict.toUpperCase()} — ${verdict.reason}\n`,
  );

  if (verdict.verdict === reportModule.VERDICT.REJECTED) {
    return 1;
  }
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    process.stderr.write(
      `Release gate crashed: ${error instanceof Error ? error.message : "unknown error"}\n`,
    );
    process.exitCode = 1;
  });
