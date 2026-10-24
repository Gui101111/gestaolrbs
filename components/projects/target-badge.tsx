import { InstagramIcon, TiktokIcon } from "@/components/brand/social-icons";
import type { VideoTarget } from "@/lib/constants/domain";
import { cn } from "@/lib/utils";

/** Selo "Reels" ou "TikTok": o destino escolhido no envio. */
export function TargetBadge({ target, className }: { target: { value: VideoTarget; short: string }; className?: string }) {
  const Icon = target.value === "tiktok" ? TiktokIcon : InstagramIcon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-cyan/35 bg-cyan/[0.08] px-2.5 py-1 text-xs font-semibold text-cyan",
        className,
      )}
    >
      <Icon className="size-3.5" />
      {target.short}
    </span>
  );
}
