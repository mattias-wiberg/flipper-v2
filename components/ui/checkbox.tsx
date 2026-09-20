"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<HTMLElement, CheckboxPrimitive.Root.Props>(
  ({ className, ...props }, ref) => (
    <CheckboxPrimitive.Root
      ref={ref}
      data-slot="checkbox"
      className={cn(
        "peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-shadow outline-none [&_svg]:size-3.5 data-checked:bg-primary data-checked:text-primary-foreground data-indeterminate:bg-primary data-indeterminate:text-primary-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        render={<Check className="pointer-events-none" />}
      />
    </CheckboxPrimitive.Root>
  ),
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
