import { Reveal } from "@/components/animations/reveal";
import { Aurora } from "@/components/effects/aurora";
import { NeonDivider } from "@/components/effects/neon-divider";

export function LegalPage({ eyebrow, title, updatedAt, children }: { eyebrow: string; title: string; updatedAt: string; children: React.ReactNode }) {
  return (
    <section className="relative isolate px-6 pt-36 pb-28 md:px-10 md:pt-44">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] overflow-hidden">
        <Aurora variant="app" interactive={false} />
      </div>
      <div className="relative mx-auto max-w-3xl">
        <Reveal>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-4 font-display text-5xl text-fg md:text-6xl">{title}</h1>
          <p className="mt-4 text-sm text-fg-2">Última atualização: {updatedAt}</p>
          <NeonDivider className="mt-8" />
        </Reveal>
        <article className="legal mt-10 space-y-6 text-[0.9375rem] leading-relaxed text-fg-2 [&_h2]:mt-12 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-fg [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-fg [&_ul]:space-y-2">
          {children}
        </article>
      </div>
    </section>
  );
}
