"use client";

import * as React from "react";
import { Separator as SeparatorPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  gold = false,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root> & { gold?: boolean }) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        gold ? (orientation === "horizontal" ? "hairline" : "hairline-v") : "bg-white/[0.07]",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
