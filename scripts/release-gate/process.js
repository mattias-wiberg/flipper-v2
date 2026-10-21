// Child-process helper shared by the local checks and the golden replay.
const { spawn } = require("node:child_process");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const OUT_LIMIT = 2_000_000;

function run(command, args, { timeoutMs = 600_000, env = process.env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      if (stdout.length < OUT_LIMIT) stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      if (stderr.length < OUT_LIMIT) stderr += chunk;
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`\`${path.basename(command)} ${args[0]}\` timed out`));
    }, timeoutMs);

    child.once("error", (error) => {
      clearTimeout(timer);
      reject(
        new Error(
          `could not run \`${path.basename(command)}\`: ${error.code ?? "unknown error"}`,
        ),
      );
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

function runNode(args, options) {
  return run(process.execPath, args, options);
}

module.exports = { REPO_ROOT, run, runNode };
