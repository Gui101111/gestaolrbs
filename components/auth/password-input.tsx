"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { passwordStrength } from "@/lib/validations/common";

export const PasswordInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, ...props }, ref) => {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={show ? "text" : "password"} className={cn("pr-12", className)} {...props} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-fg-3 transition hover:bg-fg/5 hover:text-fg"
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        tabIndex={-1}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";

export function PasswordStrength({ value }: { value: string }) {
  const { score, label } = passwordStrength(value);
  if (!value) return null;
  const colors = ["bg-destructive", "bg-warning", "bg-gold", "bg-cyan", "bg-success"];
  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <div className="flex flex-1 gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn("h-1 flex-1 rounded-full transition-colors duration-500", i < Math.max(1, score) ? colors[score] : "bg-fg/[0.08]")}
          />
        ))}
      </div>
      <span className="w-20 text-right text-[0.6875rem] text-fg-3">{label}</span>
    </div>
  );
}
