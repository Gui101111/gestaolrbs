"use client";

import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  indicatorClassName,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & { indicatorClassName?: string }) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-fg/[0.06]", className)}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "relative h-full w-full flex-1 rounded-full bg-brand-gradient shadow-[0_0_12px_-2px_var(--cyan)] transition-transform duration-700 ease-[var(--ease-luxe)]",
          "after:absolute after:inset-0 after:bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.45),transparent)] after:bg-[length:200%_100%] after:animate-[sweep_2.2s_linear_infinite]",
          indicatorClassName,
        )}
        style={{ transform: `translateX(-${100 - Math.min(100, Math.max(0, value ?? 0))}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
