"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("no-scrollbar inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-line bg-fg/[0.04] p-1", className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-[0.8125rem] font-medium whitespace-nowrap text-fg-2 transition-all duration-300",
        "hover:text-fg data-[state=active]:bg-surface data-[state=active]:text-fg data-[state=active]:shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--cyan)_45%,transparent),0_0_18px_-6px_var(--cyan)]",
        "outline-none focus-visible:ring-2 focus-visible:ring-cyan/50",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
