import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    data-slot="input"
    className={cn(
      "flex h-12 w-full min-w-0 rounded-xl border border-input bg-white/[0.03] px-4 text-ivory placeholder:text-mist/50",
      "transition-[border-color,box-shadow,background-color] duration-300 ease-[var(--ease-luxe)] outline-none",
      "hover:border-white/20 focus-visible:border-gold/60 focus-visible:bg-white/[0.045] focus-visible:shadow-[0_0_0_4px_rgb(198_161_91/0.12)]",
      "disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive/70 aria-invalid:shadow-[0_0_0_4px_rgb(208_87_77/0.12)]",
      "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ivory",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
