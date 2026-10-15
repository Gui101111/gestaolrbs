import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    data-slot="textarea"
    className={cn(
      "flex min-h-28 w-full rounded-xl border border-input bg-white/[0.03] px-4 py-3 leading-relaxed text-ivory placeholder:text-mist/50",
      "transition-[border-color,box-shadow,background-color] duration-300 outline-none resize-y",
      "hover:border-white/20 focus-visible:border-gold/60 focus-visible:bg-white/[0.045] focus-visible:shadow-[0_0_0_4px_rgb(198_161_91/0.12)]",
      "disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive/70",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
