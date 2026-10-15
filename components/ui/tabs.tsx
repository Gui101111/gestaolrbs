"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("no-scrollbar inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-white/[0.07] bg-white/[0.03] p-1", className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-[0.8125rem] font-medium whitespace-nowrap text-mist transition-all duration-300",
        "hover:text-ivory data-[state=active]:bg-gold/15 data-[state=active]:text-gold-light data-[state=active]:shadow-[inset_0_0_0_1px_rgb(198_161_91/0.35)]",
        "outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
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
