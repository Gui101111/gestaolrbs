import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    data-slot="textarea"
    className={cn(
      "flex min-h-28 w-full rounded-[14px] border border-input bg-raised/60 px-4 py-3 leading-relaxed text-fg placeholder:text-fg-3",
      "transition-[border-color,box-shadow,background-color] duration-300 outline-none resize-y",
      "hover:border-fg/25 focus-visible:border-cyan/70 focus-visible:bg-raised focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--cyan)_14%,transparent)]",
      "disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive/70",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
