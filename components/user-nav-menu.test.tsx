import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { useAuth } from "@/context/AuthContext";

import { UserNav } from "./user-nav";

type MenuChildrenProps = { children?: ReactNode };
type MenuItemProps = MenuChildrenProps & { onClick?: () => void };

const mockMenuItemHandlers = new Map<string, () => void>();

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn(),
}));
jest.mock("@/components/ui/dropdown-menu", () => {
  const React = require("react") as typeof import("react");
  const renderChildren = ({ children }: MenuChildrenProps) =>
    React.createElement("div", null, children);

  return {
    DropdownMenu: renderChildren,
    DropdownMenuContent: renderChildren,
    DropdownMenuGroup: renderChildren,
    DropdownMenuLabel: renderChildren,
    DropdownMenuSeparator: () => React.createElement("hr"),
    DropdownMenuTrigger: ({ render }: { render: ReactNode }) => render,
    DropdownMenuItem: ({ children, onClick }: MenuItemProps) => {
      if (typeof children === "string" && onClick) {
        mockMenuItemHandlers.set(children, onClick);
      }

      return React.createElement("button", { onClick }, children);
    },
  };
});

const useAuthMock = jest.mocked(useAuth);
const signOut = jest.fn(async () => undefined);
const user: User = {
  id: "user-123",
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

function renderMenu(accountUser = user) {
  useAuthMock.mockReturnValue({
    supabase: {} as SupabaseClient,
    user: accountUser,
    loading: false,
    signOut,
  });

  return renderToStaticMarkup(<UserNav />);
}

describe("UserNav account menu", () => {
  beforeEach(() => {
    mockMenuItemHandlers.clear();
    signOut.mockClear();
  });

  it("keeps account context and logout while removing duplicate navigation", async () => {
    const markup = renderMenu();

    expect(markup).toContain("Mattias Wiberg");
    expect(markup).toContain("user@example.com");
    expect(markup).toContain(">Log out</button>");
    expect(markup).not.toContain("Find flips");
    expect(markup).not.toContain("Database token");
    expect(markup).not.toContain(">Token</button>");
    expect(markup).not.toContain("Documentation");

    await mockMenuItemHandlers.get("Log out")?.();
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("keeps the email and user ID fallback identity", () => {
    const markup = renderMenu({ ...user, user_metadata: {} });

    expect(markup).toContain(">user@example.com</p>");
    expect(markup).toContain(">user-123</p>");
  });
});
