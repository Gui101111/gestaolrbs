"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;

function SheetContent({
  className,
  children,
  side = "left",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: "left" | "right" | "bottom" | "top" }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
      <SheetPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col gap-4 border-white/[0.08] bg-[#0a0d12]/95 shadow-2xl backdrop-blur-xl transition ease-[var(--ease-luxe)]",
          "data-[state=open]:animate-in data-[state=open]:duration-500 data-[state=closed]:animate-out data-[state=closed]:duration-300",
          side === "left" && "inset-y-0 left-0 h-full w-[86%] max-w-sm border-r data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
          side === "right" && "inset-y-0 right-0 h-full w-[86%] max-w-sm border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
          side === "bottom" && "inset-x-0 bottom-0 max-h-[90dvh] rounded-t-3xl border-t data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
          side === "top" && "inset-x-0 top-0 h-[100dvh] data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="absolute top-5 right-5 rounded-full p-2 text-mist transition hover:bg-white/5 hover:text-ivory">
          <X className="size-5" />
          <span className="sr-only">Fechar</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title className={cn("font-display text-xl", className)} {...props} />;
}
function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description className={cn("text-sm text-mist", className)} {...props} />;
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetTitle, SheetDescription };
