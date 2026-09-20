"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Blobatar } from "@/components/ui/blobatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";

export function UserNav() {
  const { user, loading, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <Link
        href="/log-in"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
      >
        Log in
      </Link>
    );
  }

  const handleSignOut = async () => {
    setError(null);

    try {
      await signOut();
    } catch (signOutError) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : "Could not log out",
      );
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="relative size-8 rounded-full"
            aria-label="Open account menu"
          >
            <Blobatar name={user.id} className="size-9" />
          </Button>
        }
      />
      <DropdownMenuContent className="w-56" align="end">
        {error && (
          <p role="alert" className="px-2 py-1.5 text-sm text-destructive">
            {error}
          </p>
        )}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm leading-none font-medium truncate">
                {user.user_metadata.nickname || user.email || "--"}
              </p>
              <p className="text-muted-foreground text-xs leading-none truncate">
                {user.user_metadata.nickname ? user.email : user.id}
              </p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => void handleSignOut()}>
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
