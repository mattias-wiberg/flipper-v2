const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const { DEFAULTS, main, parseArgs } = require("./sendOrders");

describe("golden order replayer", () => {
  const temporaryFiles = [];
  let stdoutOutput = "";

  beforeEach(() => {
    stdoutOutput = "";
    jest.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      stdoutOutput += chunk;
      return true;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    temporaryFiles
      .splice(0)
      .forEach((file) => fs.rmSync(file, { force: true }));
  });

  function writeCapture(batches, extension = ".jsonl") {
    const file = path.join(
      os.tmpdir(),
      `flipper-v2-sendorders-${process.pid}-${temporaryFiles.length}${extension}`,
    );
    const contents =
      extension === ".jsonl"
        ? batches.map((body) => JSON.stringify({ body })).join("\n") + "\n"
        : JSON.stringify(batches);
    fs.writeFileSync(file, contents, "utf8");
    temporaryFiles.push(file);
    return file;
  }

  function startServer(handler) {
    return new Promise((resolve) => {
      const server = http.createServer(handler);
      server.listen(0, "127.0.0.1", () => {
        resolve({
          server,
          url: `http://127.0.0.1:${server.address().port}`,
        });
      });
    });
  }

  function runCli(args) {
    return new Promise((resolve) => {
      const child = spawn(
        process.execPath,
        [path.join(__dirname, "sendOrders.js"), ...args],
        {
          env: {
            ...process.env,
            FLIPPER_INGESTION_TOKEN: "",
            FLIPPER_APP_URL: "",
          },
        },
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

  test("does not include a checked-in ingestion token", () => {
    expect(DEFAULTS.token).toBeUndefined();
    expect(parseArgs([], {}).token).toBeUndefined();
  });

  test("defaults to the local app URL and checked-in raw capture", () => {
    const options = parseArgs([], {});
    expect(DEFAULTS.appUrl).toBe("http://localhost:3000");
    expect(options.appUrl).toBe("http://localhost:3000");
    expect(path.resolve(DEFAULTS.file)).toBe(
      path.resolve(path.join(__dirname, "data", "marketorders.raw.jsonl")),
    );
  });

  test("targets the deployed base URL and dedicated token when given", () => {
    const options = parseArgs([
      "--app-url",
      "https://deployed.example",
      "--token",
      "test-token",
      "--file",
      "capture.jsonl",
    ]);
    expect(options.appUrl).toBe("https://deployed.example");
    expect(options.token).toBe("test-token");
    expect(options.file).toBe(path.resolve("capture.jsonl"));
  });

  test("accepts --flag=value and keeps values containing '='", () => {
    const options = parseArgs(
      [
        "--app-url=https://deployed.example/base",
        "--token=abc=def",
        "--file=capture.jsonl",
      ],
      {},
    );
    expect(options.appUrl).toBe("https://deployed.example/base");
    expect(options.token).toBe("abc=def");
    expect(options.file).toBe(path.resolve("capture.jsonl"));
  });

  test("lets flags override the environment", () => {
    const environment = {
      FLIPPER_INGESTION_TOKEN: "env-token",
      FLIPPER_APP_URL: "https://env.example",
    };
    expect(parseArgs([], environment)).toMatchObject({
      token: "env-token",
      appUrl: "https://env.example",
    });
    expect(parseArgs(["--token=cli-token"], environment).token).toBe(
      "cli-token",
    );
  });

  test("rejects unknown options before consuming their value", () => {
    expect(() => parseArgs(["--unknown", "value"], {})).toThrow(
      "Unknown option: --unknown",
    );
    expect(() => parseArgs(["--unknown"], {})).toThrow(
      "Unknown option: --unknown",
    );
  });

  test("reports a missing value for known flags", () => {
    expect(() => parseArgs(["--token"], {})).toThrow(
      "Missing value for --token",
    );
    expect(() => parseArgs(["--token="], {})).toThrow(
      "Missing value for --token",
    );
    expect(() => parseArgs(["--help=1"], {})).toThrow(
      "Option --help takes no value",
    );
  });

  test("replays each batch through the ingestion route of the chosen app URL", async () => {
    const batches = [
      { Orders: [{ Id: 1 }] },
      { Orders: [{ Id: 2 }] },
      { Orders: [{ Id: 3 }] },
    ];
    const file = writeCapture(batches);
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    jest.spyOn(global, "fetch").mockImplementation(fetchMock);

    const result = await main({
      file,
      token: "test-token",
      appUrl: "https://deployed.example",
    });

    expect(result).toEqual({ sent: 3, failed: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(batches.length);
    batches.forEach((batch, index) => {
      expect(fetchMock.mock.calls[index]).toEqual([
        "https://deployed.example/api/test-token/marketorders.ingest",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(batch),
        },
      ]);
    });
  });

  test("loads a JSON capture that is not JSON Lines", async () => {
    const batches = [{ Orders: [{ Id: 1 }] }, { Orders: [{ Id: 2 }] }];
    const file = writeCapture(batches, ".json");
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    jest.spyOn(global, "fetch").mockImplementation(fetchMock);

    const result = await main({
      file,
      token: "test-token",
      appUrl: "https://deployed.example",
    });

    expect(result).toEqual({ sent: 2, failed: 0 });
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify(batches[0]));
  });

  test("counts rejected batches as failures without aborting the replay", async () => {
    const file = writeCapture([
      { Orders: [{ Id: 1 }] },
      { Orders: [{ Id: 2 }] },
    ]);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "Invalid token",
      })
      .mockResolvedValueOnce({ ok: true });

    const result = await main({
      file,
      token: "test-token",
      appUrl: "https://deployed.example",
    });

    expect(result).toEqual({ sent: 1, failed: 1 });
  });

  test("counts network errors as failures and reports the first one", async () => {
    const file = writeCapture([
      { Orders: [{ Id: 1 }] },
      { Orders: [{ Id: 2 }] },
    ]);
    jest
      .spyOn(global, "fetch")
      .mockRejectedValueOnce(new Error("socket hang up"))
      .mockResolvedValueOnce({ ok: true });

    const result = await main({
      file,
      token: "test-token",
      appUrl: "https://deployed.example",
    });

    expect(result).toEqual({ sent: 1, failed: 1 });
    expect(stdoutOutput).toContain("First failure: batch 1: socket hang up");
  });

  test("exits non-zero and reports failures from the CLI", async () => {
    const file = writeCapture([
      { Orders: [{ Id: 1 }] },
      { Orders: [{ Id: 2 }] },
    ]);
    const { server, url } = await startServer((request, response) => {
      response.writeHead(500, { "Content-Type": "application/json" });
      response.end("Failed to ingest order");
    });

    try {
      const { code, stdout } = await runCli([
        "--file",
        file,
        "--token",
        "test-token",
        "--app-url",
        url,
      ]);

      expect(code).toBe(1);
      expect(stdout).toContain("Done. 0 sent, 2 failed.");
      expect(stdout).toContain(
        "First failure: batch 1: 500 Failed to ingest order",
      );
    } finally {
      server.close();
    }
  });

  test("exits zero when every batch is accepted from the CLI", async () => {
    const file = writeCapture([{ Orders: [{ Id: 1 }] }]);
    const { server, url } = await startServer((request, response) => {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end("Ingestion successful");
    });

    try {
      const { code, stdout } = await runCli([
        `--file=${file}`,
        "--token=test-token",
        `--app-url=${url}`,
      ]);

      expect(code).toBe(0);
      expect(stdout).toContain("Done. 1 sent, 0 failed.");
    } finally {
      server.close();
    }
  });
});
