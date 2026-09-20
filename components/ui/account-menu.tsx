"use client";

import * as React from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";

import { cn } from "@/lib/utils";

const AccountMenu = MenuPrimitive.Root;
const AccountMenuTrigger = MenuPrimitive.Trigger;
const AccountMenuGroup = MenuPrimitive.Group;
const AccountMenuSeparator = MenuPrimitive.Separator;

const AccountMenuContent = React.forwardRef<
  HTMLDivElement,
  MenuPrimitive.Popup.Props &
    Pick<
      MenuPrimitive.Positioner.Props,
      "align" | "alignOffset" | "side" | "sideOffset"
    >
>(
  (
    {
      align = "start",
      alignOffset = 0,
      side = "bottom",
      sideOffset = 4,
      className,
      ...props
    },
    ref
  ) => (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          ref={ref}
          className={(state) =>
            cn(
              "z-50 max-h-[var(--available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none",
              typeof className === "function" ? className(state) : className
            )
          }
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
);
AccountMenuContent.displayName = "AccountMenuContent";

const AccountMenuLabel = React.forwardRef<
  HTMLDivElement,
  MenuPrimitive.GroupLabel.Props
>(({ className, ...props }, ref) => (
  <MenuPrimitive.GroupLabel
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className as string)}
    {...props}
  />
));
AccountMenuLabel.displayName = "AccountMenuLabel";

const AccountMenuItem = React.forwardRef<
  HTMLElement,
  MenuPrimitive.Item.Props & {
    variant?: "default" | "destructive" | "primary";
  }
>(({ className, variant = "default", ...props }, ref) => (
  <MenuPrimitive.Item
    ref={ref}
    className={(state) =>
      cn(
        "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        variant === "destructive" &&
          "text-destructive data-highlighted:bg-destructive data-highlighted:text-destructive-foreground",
        variant === "primary" &&
          "text-primary data-highlighted:bg-primary data-highlighted:text-primary-foreground",
        typeof className === "function" ? className(state) : className
      )
    }
    {...props}
  />
));
AccountMenuItem.displayName = "AccountMenuItem";

export {
  AccountMenu,
  AccountMenuContent,
  AccountMenuGroup,
  AccountMenuItem,
  AccountMenuLabel,
  AccountMenuSeparator,
  AccountMenuTrigger,
};
