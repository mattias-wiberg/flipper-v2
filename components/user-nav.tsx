"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { Link } from "lucide-react";
import { useRouter } from "next/navigation";

export function UserNav() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  if (!user) {
    return (
      <Button variant="ghost" className="h-8 px-2">
        <Link href="/login">Log in</Link>
      </Button>
    );
  }
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
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{fallbackNickname}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
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
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="primary"
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
        <DropdownMenuItem onClick={signOut}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
