"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const ThemeSwitcher = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" aria-label="Change theme" />}
      >
        {theme === "light" ? (
          <Sun key="light" className="text-muted-foreground" />
        ) : theme === "dark" ? (
          <Moon key="dark" className="text-muted-foreground" />
        ) : (
          <Laptop key="system" className="text-muted-foreground" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-36" align="start">
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(value) => setTheme(value)}
          >
            <DropdownMenuRadioItem closeOnClick value="light">
              <Sun className="text-muted-foreground" />
              <span>Light</span>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem closeOnClick value="dark">
              <Moon className="text-muted-foreground" />
              <span>Dark</span>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem closeOnClick value="system">
              <Laptop className="text-muted-foreground" />
              <span>System</span>
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { ThemeSwitcher };
