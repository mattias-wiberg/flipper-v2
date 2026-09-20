import { renderToStaticMarkup } from "react-dom/server";

import { SidebarProvider } from "@/components/ui/sidebar";

import { AuthenticatedSidebar } from "./authenticated-sidebar";

describe("AuthenticatedSidebar", () => {
  it("keeps the canonical workspace and documentation destinations", () => {
    const markup = renderToStaticMarkup(
      <SidebarProvider>
        <AuthenticatedSidebar />
      </SidebarProvider>,
    );

    expect(markup).toContain('href="/authenticated/deals"');
    expect(markup).toContain(">Find flips</span>");
    expect(markup).toContain('href="/authenticated/token"');
    expect(markup).toContain(">Database token</span>");
    expect(markup).toContain('href="/documentation"');
    expect(markup).toContain(">Documentation</span>");
  });
});
