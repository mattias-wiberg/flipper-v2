const fs = require("fs");
const os = require("os");
const path = require("path");

const { DEFAULTS, main, parseArgs } = require("./sendOrders");

describe("golden order replayer", () => {
  const temporaryFiles = [];

  afterEach(() => {
    jest.restoreAllMocks();
    temporaryFiles
      .splice(0)
      .forEach((file) => fs.rmSync(file, { force: true }));
  });

  function writeCapture(batches) {
    const file = path.join(
      os.tmpdir(),
      `flipper-v2-sendorders-${process.pid}-${temporaryFiles.length}.jsonl`,
    );
    fs.writeFileSync(
      file,
      batches.map((body) => JSON.stringify({ body })).join("\n") + "\n",
      "utf8",
    );
    temporaryFiles.push(file);
    return file;
  }

  test("does not include a checked-in ingestion token", () => {
    expect(DEFAULTS.token).toBeUndefined();
  });

  test("defaults to the local app URL and checked-in raw capture", () => {
    expect(DEFAULTS.appUrl).toBe("http://localhost:3000");
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

  test("rejects unknown options", () => {
    expect(() => parseArgs(["--unknown", "value"])).toThrow(
      "Unknown option: --unknown",
    );
  });

  test("replays each batch through the ingestion route of the chosen app URL", async () => {
    const file = writeCapture([
      { Orders: [{ Id: 1 }] },
      { Orders: [{ Id: 2 }] },
    ]);
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    jest.spyOn(global, "fetch").mockImplementation(fetchMock);

    const result = await main({
      file,
      token: "test-token",
      appUrl: "https://deployed.example",
    });

    expect(result).toEqual({ sent: 2, failed: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://deployed.example/api/test-token/marketorders.ingest",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Orders: [{ Id: 1 }] }),
      }),
    );
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
});
