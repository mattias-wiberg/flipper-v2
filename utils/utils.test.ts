import { groupBy } from "./utils";

describe("groupBy", () => {
  it("groups by a single key", () => {
    const data = [
      { type: "A", value: 1 },
      { type: "B", value: 2 },
      { type: "A", value: 3 },
    ];
    const result = groupBy(data, (item) => item.type);
    expect(result).toEqual({
      A: [
        { type: "A", value: 1 },
        { type: "A", value: 3 },
      ],
      B: [{ type: "B", value: 2 }],
    });
  });

  it("returns an empty object for empty input", () => {
    expect(
      groupBy<{ type: string; value: number }>([], (item) => item.type)
    ).toEqual({});
  });
});
