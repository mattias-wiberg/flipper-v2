const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const { DEFAULTS, assertSafeOutput, main, parseArgs } = require("./getOrders");

const expectedOutput = path.join(
  __dirname,
  "data",
  "marketorders.expected.json",
);

function sha256(file) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");
}

function runCli(args) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [path.join(__dirname, "getOrders.js"), ...args],
      { env: { ...process.env } },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

describe("golden order exporter", () => {
  const temporaryPaths = [];
  let caseInsensitiveFilesystem;

  beforeEach(() => {
    caseInsensitiveFilesystem =
      process.platform === "win32" || process.platform === "darwin";
    jest.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    temporaryPaths
      .splice(0)
      .forEach((entry) => fs.rmSync(entry, { force: true, recursive: true }));
  });

  function temporaryPath(name) {
    const directory = path.join(
      os.tmpdir(),
      `flipper-v2-getorders-${process.pid}-${temporaryPaths.length}`,
    );
    fs.mkdirSync(directory, { recursive: true });
    temporaryPaths.push(directory);
    return path.join(directory, name);
  }

  test("does not include a checked-in ingestion token", () => {
    expect(DEFAULTS.token).toBeUndefined();
    expect(parseArgs([], {}).token).toBeUndefined();
  });

  test("uses a temporary output instead of the checked-in fixture by default", () => {
    expect(path.resolve(parseArgs([]).output)).not.toBe(
      path.resolve(expectedOutput),
    );
    expect(path.resolve(DEFAULTS.output)).not.toBe(
      path.resolve(expectedOutput),
    );
  });

  test("reads credentials and token from the environment unless flags override", () => {
    const environment = {
      FLIPPER_INGESTION_TOKEN: "env-token",
      NEXT_PUBLIC_SUPABASE_URL: "https://env.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "env-key",
    };
    expect(parseArgs([], environment)).toMatchObject({
      token: "env-token",
      url: "https://env.supabase.co",
      key: "env-key",
    });

    const options = parseArgs(
      [
        "--token=cli-token",
        "--url=https://cli.supabase.co",
        "--key=cli-key",
        "--page-size=250",
        "--include-created-at",
        "--compare",
      ],
      environment,
    );
    expect(options).toMatchObject({
      token: "cli-token",
      url: "https://cli.supabase.co",
      key: "cli-key",
      pageSize: 250,
      includeCreatedAt: true,
      compare: true,
    });
  });

  test("rejects unknown options before consuming their value", () => {
    expect(() => parseArgs(["--unknown", "value"], {})).toThrow(
      "Unknown option: --unknown",
    );
    expect(() => parseArgs(["--unknown"], {})).toThrow(
      "Unknown option: --unknown",
    );
    expect(() => parseArgs(["--key"], {})).toThrow("Missing value for --key");
  });

  test("rejects the checked-in fixture as an explicit output", () => {
    expect(() => assertSafeOutput(expectedOutput)).toThrow(
      "Refusing to overwrite the checked-in expected fixture",
    );
  });

  test("rejects a case variant of the checked-in fixture", () => {
    if (!caseInsensitiveFilesystem) {
      return;
    }
    expect(() => assertSafeOutput(expectedOutput.toUpperCase())).toThrow(
      "Refusing to overwrite the checked-in expected fixture",
    );
  });

  test("rejects a hardlink to the checked-in fixture", () => {
    const link = temporaryPath("hardlink.json");
    fs.linkSync(expectedOutput, link);

    expect(() => assertSafeOutput(link)).toThrow(
      "Refusing to overwrite the checked-in expected fixture",
    );
  });

  test("rejects a symlink to the checked-in fixture", () => {
    const link = temporaryPath("symlink.json");
    try {
      fs.symlinkSync(expectedOutput, link, "file");
    } catch {
      return;
    }

    expect(() => assertSafeOutput(link)).toThrow(
      "Refusing to overwrite the checked-in expected fixture",
    );
  });

  test("allows a temporary output path", () => {
    expect(() => assertSafeOutput(temporaryPath("export.json"))).not.toThrow();
  });

  test("writes the fetched rows to the output path and leaves the fixture intact", async () => {
    const rows = [
      {
        id: 1,
        item_type_id: "T4_BAG",
        location_id: 3005,
        unit_price_silver: 1000,
        amount: 2,
        action_type: "offer",
        expires: "2026-10-09T00:00:00",
      },
      {
        id: 2,
        item_type_id: "T5_BAG",
        location_id: 3005,
        unit_price_silver: 2000,
        amount: 1,
        action_type: "request",
        expires: "2026-10-09T00:00:00",
      },
    ];
    const output = temporaryPath("export.json");
    const fixtureHashBefore = sha256(expectedOutput);
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce({ ok: true, json: async () => rows })
      .mockResolvedValueOnce({ ok: true, json: async () => [rows[0]] });

    const exported = [...rows, rows[0]];
    const result = await main({
      key: "test-service-role-key",
      url: "https://example.supabase.co/",
      token: "test-token",
      output,
      pageSize: 2,
    });

    expect(result).toEqual({ count: 3, output });
    expect(fs.readFileSync(output, "utf8")).toBe(
      `${JSON.stringify(exported)}\n`,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain(
      "https://example.supabase.co/rest/v1/orders?",
    );
    expect(fetchMock.mock.calls[0][0]).toContain("token=eq.test-token");
    expect(fetchMock.mock.calls[0][0]).toContain("offset=0");
    expect(fetchMock.mock.calls[1][0]).toContain("offset=2");
    expect(fetchMock.mock.calls[0][1]).toEqual({
      headers: {
        apikey: "test-service-role-key",
        Authorization: "Bearer test-service-role-key",
      },
    });
    expect(sha256(expectedOutput)).toBe(fixtureHashBefore);
  });

  test("fails without writing when the Supabase query is rejected", async () => {
    const output = temporaryPath("rejected.json");
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Invalid API key",
    });

    await expect(
      main({
        key: "test-service-role-key",
        url: "https://example.supabase.co",
        token: "test-token",
        output,
      }),
    ).rejects.toThrow("Supabase orders query failed (401)");
    expect(fs.existsSync(output)).toBe(false);
  });

  test("exports through the CLI entry point", async () => {
    const rows = [{ id: 1, item_type_id: "T4_BAG" }];
    const output = temporaryPath("cli-export.json");
    const server = http.createServer((request, response) => {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify(rows));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${server.address().port}`;

    try {
      const { code, stdout } = await runCli([
        `--url=${url}`,
        "--key=test-service-role-key",
        "--token=test-token",
        `--output=${output}`,
      ]);

      expect(code).toBe(0);
      expect(stdout).toContain(`Saved 1 orders to ${output}`);
      expect(fs.readFileSync(output, "utf8")).toBe(`${JSON.stringify(rows)}\n`);
    } finally {
      server.close();
    }
  });
});
