import { cn } from "@/lib/utils";

export function Logo({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex flex-col leading-none transition-colors duration-300",
        tone === "light" ? "text-white" : "text-berry-deep",
        className,
      )}
    >
      <span className="font-display text-[1.6rem] font-extrabold tracking-[0.04em]">BERRY&apos;S</span>
      <span className="mt-0.5 pl-0.5 font-display text-[0.58rem] font-bold tracking-[0.42em]">
        ICED FOOD
      </span>
    </span>
  );
}
