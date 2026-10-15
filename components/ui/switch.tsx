"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-white/10 p-0.5 outline-none",
        "transition-all duration-500 ease-[var(--ease-luxe)]",
        "data-[state=unchecked]:bg-white/[0.06] data-[state=checked]:border-gold/60 data-[state=checked]:bg-gold/25",
        "data-[state=checked]:shadow-[0_0_18px_-4px_rgb(198_161_91/0.7)]",
        "focus-visible:ring-2 focus-visible:ring-gold/50 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-[18px] rounded-full shadow-md transition-all duration-500 ease-[var(--ease-luxe)]",
          "data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-mist/70",
          "data-[state=checked]:translate-x-5 data-[state=checked]:bg-gold-light",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
