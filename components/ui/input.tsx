import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    data-slot="input"
    className={cn(
      "flex h-12 w-full min-w-0 rounded-[14px] border border-input bg-raised/60 px-4 text-fg placeholder:text-fg-3",
      "transition-[border-color,box-shadow,background-color] duration-300 ease-[var(--ease-luxe)] outline-none",
      "hover:border-fg/25 focus-visible:border-cyan/70 focus-visible:bg-raised focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--cyan)_14%,transparent)]",
      "disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive/70 aria-invalid:shadow-[0_0_0_4px_color-mix(in_oklab,var(--destructive)_14%,transparent)]",
      "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-fg",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
