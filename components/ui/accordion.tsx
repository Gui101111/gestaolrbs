"use client";

import * as React from "react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const Accordion = AccordionPrimitive.Root;

function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn("border-b border-white/[0.07]", className)} {...props} />;
}

function AccordionTrigger({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          "group flex flex-1 items-center justify-between gap-6 py-6 text-left font-display text-xl text-ivory transition-colors outline-none hover:text-gold-light md:text-2xl",
          "focus-visible:text-gold-light",
          className,
        )}
        {...props}
      >
        {children}
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-gold/30 text-gold transition-all duration-500 ease-[var(--ease-luxe)] group-hover:border-gold/60 group-data-[state=open]:rotate-45 group-data-[state=open]:bg-gold/10">
          <Plus className="size-4" />
        </span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      {...props}
    >
      <div className={cn("pb-6 pr-14 text-[0.9375rem] leading-relaxed text-mist", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
