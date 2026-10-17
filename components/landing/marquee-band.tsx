import { Marquee } from "@/components/animations/marquee";
import { InstagramIcon, LinkedinIcon, MetaIcon, TiktokIcon, YoutubeIcon } from "@/components/brand/social-icons";

const ITEMS = [
  { kind: "icon", Icon: TiktokIcon, label: "TikTok" },
  { kind: "ratio", ratio: "9:16", w: 9, h: 16 },
  { kind: "icon", Icon: InstagramIcon, label: "Instagram" },
  { kind: "ratio", ratio: "1:1", w: 1, h: 1 },
  { kind: "icon", Icon: YoutubeIcon, label: "YouTube" },
  { kind: "ratio", ratio: "4:5", w: 4, h: 5 },
  { kind: "icon", Icon: MetaIcon, label: "Meta" },
  { kind: "ratio", ratio: "16:9", w: 16, h: 9 },
  { kind: "icon", Icon: LinkedinIcon, label: "LinkedIn" },
] as const;

/** Bloco 2: faixa gráfica (ícones de plataformas e chips de formato), sem frases. */
export function MarqueeBand() {
  return (
    <section aria-label="Plataformas e formatos" className="relative py-8 md:py-10">
      <div aria-hidden className="hairline absolute inset-x-0 top-0 opacity-60" />
      <Marquee baseVelocity={-1.4} itemClassName="gap-4 pr-4 md:gap-6 md:pr-6">
        {ITEMS.map((it, i) =>
          it.kind === "icon" ? (
            <span key={i} className="grid size-12 place-items-center rounded-2xl border border-line bg-fg/[0.03] text-fg-2 md:size-14">
              <it.Icon className="size-5 md:size-6" />
              <span className="sr-only">{it.label}</span>
            </span>
          ) : (
            <span key={i} className="flex h-12 items-center gap-2.5 rounded-2xl border border-cyan/25 bg-cyan/[0.05] px-4 md:h-14 md:px-5">
              <span
                aria-hidden
                className="rounded-[3px] border-[1.5px] border-cyan shadow-[0_0_10px_-2px_var(--cyan)]"
                style={{ width: it.w >= it.h ? 18 : (18 * it.w) / it.h, height: it.h >= it.w ? 18 : (18 * it.h) / it.w }}
              />
              <span className="font-display text-sm font-bold text-fg md:text-base">{it.ratio}</span>
            </span>
          ),
        )}
      </Marquee>
      <div aria-hidden className="hairline absolute inset-x-0 bottom-0 opacity-60" />
    </section>
  );
}
