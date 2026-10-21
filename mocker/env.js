const fs = require("fs");
const path = require("path");

const DEFAULT_APP_URL = "http://localhost:3000";

function loadEnvFile(file) {
  if (!fs.existsSync(file)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .flatMap((line) => {
        const match = line.match(
          /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/i,
        );
        if (!match) {
          return [];
        }

        return [[match[1], match[2].replace(/^(['"])(.*)\1$/, "$2")]];
      }),
  );
}

function getEnvironment({ cwd = process.cwd(), env = process.env } = {}) {
  return {
    ...loadEnvFile(path.join(cwd, ".env")),
    ...loadEnvFile(path.join(cwd, ".env.local")),
    ...env,
  };
}

function resolveIngestionSettings(environment = getEnvironment()) {
  return {
    token: environment.FLIPPER_INGESTION_TOKEN,
    appUrl: environment.FLIPPER_APP_URL || DEFAULT_APP_URL,
  };
}

module.exports = { DEFAULT_APP_URL, getEnvironment, resolveIngestionSettings };
