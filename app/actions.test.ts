jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn(),
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next/headers", () => ({ headers: jest.fn() }));
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));

import {
  deleteItemOrdersAction,
  deleteSpecificOrderAction,
  forgotPasswordAction,
  resetPasswordAction,
  signInAction,
  signOutAction,
  signUpAction,
} from "./actions";
import { AUTHENTICATED_REDIRECT } from "@/utils/auth";
import { CANONICAL_SITE_URL } from "@/lib/site-url";

const mockCreateClient = jest.mocked(
  jest.requireMock("@/utils/supabase/server").createClient,
);
const mockRevalidatePath = jest.mocked(
  jest.requireMock("next/cache").revalidatePath,
);
const mockHeaders = jest.mocked(jest.requireMock("next/headers").headers);
const mockRedirect = jest.mocked(jest.requireMock("next/navigation").redirect);

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

describe("auth lifecycle actions at the beta origin", () => {
  const origin = CANONICAL_SITE_URL;

  function configureAuthClient(auth: Record<string, jest.Mock>) {
    mockCreateClient.mockResolvedValue({ auth });
    return auth;
  }

  beforeEach(() => {
    mockCreateClient.mockReset();
    mockHeaders.mockReset();
    mockRedirect.mockReset();
    mockHeaders.mockResolvedValue(new Headers({ origin }));
  });

  it("builds the password recovery callback on the beta origin with a safe redirect_to", async () => {
    const resetPasswordForEmail = jest.fn().mockResolvedValue({ error: null });
    configureAuthClient({ resetPasswordForEmail });

    await forgotPasswordAction({ email: "user@example.com" });

    expect(resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {
      redirectTo:
        "https://beta.flipper.mattiaswiberg.com/auth/callback?redirect_to=%2Fauthenticated%2Freset-password",
    });
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining("/forgot-password?success="),
    );
  });

  it("rejects an invalid recovery email without calling Supabase", async () => {
    const resetPasswordForEmail = jest.fn();
    configureAuthClient({ resetPasswordForEmail });

    await forgotPasswordAction({ email: "not-an-email" });

    expect(resetPasswordForEmail).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining("/forgot-password?error="),
    );
  });

  it("builds the verification callback on the beta origin", async () => {
    const signUp = jest.fn().mockResolvedValue({ error: null });
    configureAuthClient({ signUp });

    await signUpAction({
      nickname: "Tester",
      email: "user@example.com",
      password: "secret1",
      confirmPassword: "secret1",
    });

    expect(signUp).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secret1",
      options: {
        emailRedirectTo: "https://beta.flipper.mattiaswiberg.com/auth/callback",
        data: { nickname: "Tester" },
      },
    });
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining("/sign-up?success="),
    );
  });

  it("sends a failed sign-in back to the login surface", async () => {
    const signInWithPassword = jest
      .fn()
      .mockResolvedValue({ error: { message: "Invalid login credentials" } });
    configureAuthClient({ signInWithPassword });

    await signInAction({ email: "user@example.com", password: "wrong" });

    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining("/log-in?error="),
    );
  });

  it("redirects a successful sign-in to deal discovery", async () => {
    const signInWithPassword = jest.fn().mockResolvedValue({ error: null });
    configureAuthClient({ signInWithPassword });

    await signInAction({ email: "user@example.com", password: "secret1" });

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secret1",
    });
    expect(mockRedirect).toHaveBeenCalledWith(AUTHENTICATED_REDIRECT);
  });

  it("returns sign-out to the login page", async () => {
    const signOut = jest.fn().mockResolvedValue({ error: null });
    configureAuthClient({ signOut });

    await signOutAction();

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(mockRedirect).toHaveBeenCalledWith("/log-in");
  });

  it("updates the password and returns to the reset surface", async () => {
    const updateUser = jest.fn().mockResolvedValue({ error: null });
    configureAuthClient({ updateUser });

    const formData = new FormData();
    formData.set("password", "secret-one");
    formData.set("confirmPassword", "secret-one");

    await resetPasswordAction(formData);

    expect(updateUser).toHaveBeenCalledWith({ password: "secret-one" });
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining("/authenticated/reset-password?success="),
    );
  });

  it("rejects mismatched passwords without updating the user", async () => {
    const updateUser = jest.fn();
    configureAuthClient({ updateUser });

    const formData = new FormData();
    formData.set("password", "secret-one");
    formData.set("confirmPassword", "secret-two");

    await resetPasswordAction(formData);

    expect(updateUser).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining("/authenticated/reset-password?error="),
    );
  });

  it("reports a failed password update on the reset surface", async () => {
    const updateUser = jest
      .fn()
      .mockResolvedValue({ error: new Error("weak password") });
    configureAuthClient({ updateUser });

    const formData = new FormData();
    formData.set("password", "secret-one");
    formData.set("confirmPassword", "secret-one");

    await resetPasswordAction(formData);

    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining("/authenticated/reset-password?error="),
    );
  });
});
