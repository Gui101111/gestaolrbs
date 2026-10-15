import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-white/10 bg-white/[0.04] text-mist",
        gold: "border-gold/35 bg-gold/10 text-gold-light",
        success: "border-success/30 bg-success/10 text-success",
        warning: "border-warning/30 bg-warning/10 text-warning",
        danger: "border-destructive/35 bg-destructive/10 text-[#ec8a80]",
        info: "border-info/30 bg-info/10 text-info",
        navy: "border-navy-soft bg-navy-deep text-ivory/80",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
