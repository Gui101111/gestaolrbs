import { formatRelative } from "@/lib/utils";

/**
 * Data relativa ("há 2 minutos"). O texto pode mudar entre o servidor e o
 * navegador se a virada de minuto acontecer no meio; o navegador prevalece.
 */
export function TimeAgo({ value, className }: { value: string | null | undefined; className?: string }) {
  return (
    <time dateTime={value ?? undefined} className={className} suppressHydrationWarning>
      {formatRelative(value)}
    </time>
  );
}
