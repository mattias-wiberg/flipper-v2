/** @jest-environment jsdom */

import type {
  AuthChangeEvent,
  Session,
  SupabaseClient,
  User,
} from "@supabase/supabase-js";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

import { AuthProvider, useAuth } from "./AuthContext";

jest.mock("@/utils/supabase/client", () => ({
  createClient: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(() => ({
    refresh: jest.fn(),
    replace: jest.fn(),
  })),
}));

const createClientMock = jest.mocked(createClient);
const usePathnameMock = jest.mocked(usePathname);

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function createUser(id: string): User {
  return {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: "user@example.com",
    phone: "",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { nickname: "Mattias Wiberg" },
    identities: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

function createSession(user: User): Session {
  return {
    access_token: "access-token",
    expires_in: 3600,
    expires_at: 1893456000,
    refresh_token: "refresh-token",
    token_type: "bearer",
    user,
  };
}

function AuthState() {
  const { loading, user } = useAuth();

  return <output>{loading ? "loading" : (user?.id ?? "logged-out")}</output>;
}

describe("AuthProvider", () => {
  it("refreshes the client session after navigation from login", async () => {
    const user = createUser("user-123");
    const getSession = jest
      .fn()
      .mockResolvedValueOnce({ data: { session: null } })
      .mockResolvedValueOnce({ data: { session: createSession(user) } });
    const onAuthStateChange = jest.fn(
      (
        _callback: (event: AuthChangeEvent, session: Session | null) => void,
      ) => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    );
    const client = {
      auth: {
        getSession,
        onAuthStateChange,
        signOut: jest.fn(),
      },
    } as unknown as SupabaseClient;

    createClientMock.mockReturnValue(client);
    usePathnameMock.mockReturnValue("/log-in");

    const container = document.createElement("div");
    let renderer!: Root;
    await act(async () => {
      renderer = createRoot(container);
      renderer.render(
        <AuthProvider>
          <AuthState />
        </AuthProvider>,
      );
    });

    expect(container.textContent).toBe("logged-out");

    usePathnameMock.mockReturnValue("/authenticated/deals");
    await act(async () => {
      renderer.render(
        <AuthProvider>
          <AuthState />
        </AuthProvider>,
      );
    });

    expect(getSession).toHaveBeenCalledTimes(2);
    expect(container.textContent).toBe("user-123");
    await act(async () => {
      renderer.unmount();
    });
  });
});
