"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UserNav() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
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
          : "Could not log out"
      );
    }
  };

  // Fall back to be either first two letters in capital or First letters in first 2 words if nickname contains a space
  const fallbackNickname = user?.user_metadata.nickname
    ? user.user_metadata.nickname
        .split(" ")
        .slice(0, 2)
        .map((word: string) => word.charAt(0).toUpperCase())
        .join("")
    : "U";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="relative h-8 w-8 rounded-full"
            aria-label="Open account menu"
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback>{fallbackNickname}</AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <DropdownMenuContent className="w-56" align="end">
        {error && (
          <p
            role="alert"
            className="px-2 py-1.5 text-sm text-destructive"
          >
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
        <DropdownMenuItem
          className="text-primary data-highlighted:bg-primary data-highlighted:text-primary-foreground"
          onClick={() => router.push("/authenticated/deals")}
        >
          Find flips!
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push("/authenticated/token")}>
            Token
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/documentation")}>
            Documentation
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void handleSignOut()}>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
