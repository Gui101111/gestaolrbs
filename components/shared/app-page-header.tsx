import { AccentText } from "@/components/shared/accent-text";
import { cn } from "@/lib/utils";

/** Cabeçalho das páginas do app: título curto (com acento opcional *assim*) e subtítulo de até 12 palavras. */
export function AppPageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-3xl text-fg md:text-4xl">
          <AccentText text={title} />
        </h1>
        {subtitle && <p className="mt-1.5 text-sm text-fg-2 md:text-[0.9375rem]">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
