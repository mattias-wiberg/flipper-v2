const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  DEFAULT_APP_URL,
  getEnvironment,
  resolveIngestionSettings,
} = require("./env");

describe("mocker environment", () => {
  let directory;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "flipper-v2-env-"));
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  test("defaults the app URL to local and leaves the token unset", () => {
    expect(resolveIngestionSettings({})).toEqual({
      token: undefined,
      appUrl: DEFAULT_APP_URL,
    });
    expect(DEFAULT_APP_URL).toBe("http://localhost:3000");
  });

  test("reads .env and then .env.local from the working directory", () => {
    fs.writeFileSync(
      path.join(directory, ".env"),
      [
        "# local development credentials",
        "",
        "FLIPPER_INGESTION_TOKEN=from-env",
        "FLIPPER_APP_URL=https://env.example",
      ].join("\n"),
    );
    fs.writeFileSync(
      path.join(directory, ".env.local"),
      'FLIPPER_INGESTION_TOKEN="from-local"\n',
    );

    const environment = getEnvironment({ cwd: directory, env: {} });

    expect(environment.FLIPPER_INGESTION_TOKEN).toBe("from-local");
    expect(environment.FLIPPER_APP_URL).toBe("https://env.example");
  });

  test("lets the process environment win over the env files", () => {
    fs.writeFileSync(
      path.join(directory, ".env"),
      "FLIPPER_INGESTION_TOKEN=from-env\nFLIPPER_APP_URL=https://env.example\n",
    );

    const environment = getEnvironment({
      cwd: directory,
      env: { FLIPPER_INGESTION_TOKEN: "from-process" },
    });

    expect(resolveIngestionSettings(environment)).toEqual({
      token: "from-process",
      appUrl: "https://env.example",
    });
  });
});
