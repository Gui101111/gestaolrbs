import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/** Campo de formulário com rótulo, dica e mensagem de erro amigável. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
  optional,
}: {
  label?: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string;
  className?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {optional && <span className="text-[0.6875rem] font-normal text-fg-3">(opcional)</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p role="alert" className="flex items-center gap-1.5 text-[0.8125rem] text-destructive animate-in fade-in-0 slide-in-from-top-1">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-[0.8125rem] text-fg-3">{hint}</p>
      ) : null}
    </div>
  );
}
