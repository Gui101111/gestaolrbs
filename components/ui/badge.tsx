import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-[0.1em] [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-line bg-fg/[0.05] text-fg-2",
        cyan: "border-cyan/35 bg-cyan/10 text-cyan",
        azure: "border-azure/35 bg-azure/10 text-azure",
        gold: "border-gold/40 bg-gold/10 text-gold",
        success: "border-success/30 bg-success/10 text-success",
        warning: "border-warning/30 bg-warning/10 text-warning",
        danger: "border-destructive/35 bg-destructive/10 text-destructive",
        info: "border-info/30 bg-info/10 text-info",
        navy: "border-line bg-raised text-fg-2",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
