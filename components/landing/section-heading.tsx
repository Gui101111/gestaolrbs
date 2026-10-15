import { cn } from "@/lib/utils";
import { AnimatedText } from "@/components/animations/animated-text";
import { Reveal } from "@/components/animations/reveal";

export function SectionHeading({
  eyebrow,
  title,
  highlight,
  description,
  align = "left",
  className,
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      <Reveal y={12} blur={4}>
        <span className={cn("eyebrow inline-flex items-center gap-3", align === "center" && "justify-center")}>
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-gold" />
          {eyebrow}
          {align === "center" && <span className="h-px w-8 bg-gradient-to-l from-transparent to-gold" />}
        </span>
      </Reveal>
      <AnimatedText
        as="h2"
        className="mt-5 font-display text-4xl leading-[1.05] font-medium text-ivory md:text-6xl"
        segments={[{ text: title }, ...(highlight ? [{ text: ` ${highlight}`, className: "text-gold-gradient italic" }] : [])]}
      />
      {description && (
        <Reveal delay={0.25} y={16}>
          <p className={cn("mt-6 text-base leading-relaxed text-mist md:text-lg", align === "center" && "mx-auto max-w-2xl")}>
            {description}
          </p>
        </Reveal>
      )}
    </div>
  );
}
