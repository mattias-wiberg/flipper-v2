"use client";

import * as React from "react";
import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";

type LegacyRenderProps = {
  asChild?: boolean;
};

function Collapsible({
  asChild = false,
  children,
  render,
  ...props
}: CollapsiblePrimitive.Root.Props & LegacyRenderProps) {
  const rootRender =
    render ?? (asChild && React.isValidElement(children) ? children : undefined);

  return (
    <CollapsiblePrimitive.Root
      data-slot="collapsible"
      render={rootRender}
      {...props}
    >
      {asChild ? null : children}
    </CollapsiblePrimitive.Root>
  );
}

function CollapsibleTrigger({
  asChild = false,
  children,
  render,
  ...props
}: CollapsiblePrimitive.Trigger.Props & LegacyRenderProps) {
  const triggerRender =
    render ?? (asChild && React.isValidElement(children) ? children : undefined);

  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      nativeButton={asChild ? false : undefined}
      render={triggerRender}
      {...props}
    >
      {asChild ? null : children}
    </CollapsiblePrimitive.Trigger>
  );
}

function CollapsibleContent({
  ...props
}: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      {...props}
    />
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
