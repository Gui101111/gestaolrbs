import { Reveal } from "@/components/animations/reveal";

export function LegalPage({ eyebrow, title, updatedAt, children }: { eyebrow: string; title: string; updatedAt: string; children: React.ReactNode }) {
  return (
    <section className="relative px-6 pt-36 pb-28 md:px-10 md:pt-44">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_60%_80%_at_50%_0%,rgba(22,38,61,0.8),transparent)]" />
      <div className="relative mx-auto max-w-3xl">
        <Reveal>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-4 font-display text-5xl text-ivory md:text-6xl">{title}</h1>
          <p className="mt-4 text-sm text-mist">Última atualização: {updatedAt}</p>
          <div className="mt-8 hairline" />
        </Reveal>
        <article className="legal mt-10 space-y-6 text-[0.9375rem] leading-relaxed text-mist [&_h2]:mt-12 [&_h2]:font-display [&_h2]:text-3xl [&_h2]:text-ivory [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ivory/90 [&_ul]:space-y-2">
          {children}
        </article>
      </div>
    </section>
  );
}
