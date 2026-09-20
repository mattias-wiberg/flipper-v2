jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn(),
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next/headers", () => ({ headers: jest.fn() }));
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));

import { deleteItemOrdersAction, deleteSpecificOrderAction } from "./actions";

const mockCreateClient = jest.mocked(
  jest.requireMock("@/utils/supabase/server").createClient,
);
const mockRevalidatePath = jest.mocked(
  jest.requireMock("next/cache").revalidatePath,
);

function makeQuery(error: Error | null = null) {
  const result = Promise.resolve({ error });
  const query = {
    delete: jest.fn(),
    not: jest.fn(),
    ilikeAnyOf: jest.fn(),
    eq: jest.fn(),
    in: jest.fn(),
    then: result.then.bind(result),
  };

  query.delete.mockReturnValue(query);
  query.not.mockReturnValue(query);
  query.ilikeAnyOf.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockReturnValue(query);

  return query;
}

function configureClient(
  query: ReturnType<typeof makeQuery>,
  user: object | null,
) {
  const getUser = jest.fn().mockResolvedValue({
    data: { user },
    error: null,
  });
  const from = jest.fn().mockReturnValue(query);

  mockCreateClient.mockResolvedValue({
    auth: { getUser },
    from,
  });

  return { from, getUser };
}

describe("order deletion actions", () => {
  beforeEach(() => {
    mockCreateClient.mockReset();
    mockRevalidatePath.mockReset();
  });

  it("deletes both order ids through one authorized query", async () => {
    const query = makeQuery();
    const { from, getUser } = configureClient(query, { id: "user-1" });

    await expect(deleteSpecificOrderAction([17, 23])).resolves.toBe(false);

    expect(getUser).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("orders");
    expect(query.in).toHaveBeenCalledWith("id", [17, 23]);
    expect(query.eq).not.toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/authenticated/deals");
  });

  it("keeps the item reset filters and revalidation behavior", async () => {
    const query = makeQuery();
    configureClient(query, { id: "user-1" });

    await expect(deleteItemOrdersAction()).resolves.toBe(false);

    expect(query.not).toHaveBeenNthCalledWith(
      1,
      "item_type_id",
      "ilike",
      "%RUNE%",
    );
    expect(query.not).toHaveBeenNthCalledWith(
      2,
      "item_type_id",
      "ilike",
      "%SOUL%",
    );
    expect(query.not).toHaveBeenNthCalledWith(
      3,
      "item_type_id",
      "ilike",
      "%RELIC%",
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/authenticated/deals");
  });

  it("does not issue a delete query without an authenticated user", async () => {
    const query = makeQuery();
    const { from } = configureClient(query, null);

    await expect(deleteSpecificOrderAction(17)).resolves.toBe(true);

    expect(from).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
