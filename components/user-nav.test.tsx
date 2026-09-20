import type { SupabaseClient, User } from "@supabase/supabase-js";
import { renderToStaticMarkup } from "react-dom/server";

import { useAuth } from "@/context/AuthContext";

import { UserNav } from "./user-nav";

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

const useAuthMock = jest.mocked(useAuth);
const signOut = jest.fn(async () => undefined);

function createUser(
  id: string,
  nickname: string | undefined,
  email = "user@example.com",
): User {
  return {
    id,
    aud: "authenticated",
    role: "authenticated",
    email,
    phone: "",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: nickname ? { nickname } : {},
    identities: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

function renderUserNav(user: User | null, loading = false) {
  useAuthMock.mockReturnValue({
    supabase: {} as SupabaseClient,
    user,
    loading,
    signOut,
  });

  return renderToStaticMarkup(<UserNav />);
}

function getAvatarMarkup(markup: string) {
  const avatar = markup.match(/<svg[\s\S]*?<\/svg>/)?.[0];
  expect(avatar).toBeDefined();
  return avatar;
}

describe("UserNav", () => {
  it("renders a local avatar from the stable user ID", () => {
    const markup = renderUserNav(createUser("user-123", "Mattias Wiberg"));

    expect(markup).toContain('aria-label="Open account menu"');
    expect(markup).not.toContain(">MW</span>");
    expect(markup).toContain("<svg");
    expect(markup).toContain("mo-always");
  });

  it("keeps the avatar stable when display metadata changes", () => {
    const original = getAvatarMarkup(
      renderUserNav(createUser("user-123", "Mattias Wiberg")),
    );
    const renamed = getAvatarMarkup(
      renderUserNav(
        createUser("user-123", "Different Name", "different@example.com"),
      ),
    );

    expect(renamed).toBe(original);
    expect(
      getAvatarMarkup(
        renderUserNav(createUser("different-user", "Mattias Wiberg")),
      ),
    ).not.toBe(original);
  });

  it("preserves loading and unauthenticated branches", () => {
    expect(renderUserNav(null, true)).toBe("");
    expect(renderUserNav(null)).toContain('href="/log-in"');
    expect(renderUserNav(null)).toContain(">Log in</a>");
  });
});
