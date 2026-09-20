const path = require("path");

const { DEFAULTS, main, parseArgs } = require("./getOrders");

const expectedOutput = path.join(
  __dirname,
  "data",
  "marketorders.expected.json",
);

describe("golden order exporter", () => {
  test("uses a temporary output instead of the checked-in fixture by default", () => {
    expect(path.resolve(parseArgs([]).output)).not.toBe(
      path.resolve(expectedOutput),
    );
    expect(path.resolve(DEFAULTS.output)).not.toBe(
      path.resolve(expectedOutput),
    );
  });

  test("rejects the checked-in fixture as an explicit output", async () => {
    await expect(
      main({
        key: "test-service-role-key",
        output: expectedOutput,
        token: "test-token",
        url: "https://example.supabase.co",
      }),
    ).rejects.toThrow("Refusing to overwrite the checked-in expected fixture");
  });
});
