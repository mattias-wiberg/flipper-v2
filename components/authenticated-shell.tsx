"use client";

import { usePathname } from "next/navigation";

import { AuthenticatedSidebar } from "@/components/authenticated-sidebar";
import { UserNav } from "@/components/user-nav";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function AuthenticatedShell({
  nickname,
  children,
}: {
  nickname?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/authenticated/reset-password") {
    return children;
  }

  return (
    <SidebarProvider>
      <AuthenticatedSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
          <SidebarTrigger />
          <div className="ml-auto">
            <UserNav />
          </div>
        </header>
        <main className="flex min-w-0 flex-1 flex-col gap-8 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-semibold tracking-tight">
              Welcome back{nickname && `, ${nickname}`}
            </h2>
            <p className="text-muted-foreground">
              Thank you for using Flipper!
            </p>
          </div>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
