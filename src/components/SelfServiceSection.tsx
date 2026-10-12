import { photos } from "@/data/images";
import { AnimatedSection, MaskTitle, Reveal } from "./AnimatedSection";
import { ParallaxImage } from "./ParallaxImage";
import { Spot } from "./Blobs";

const steps = [
  { n: "01", title: "Escolha", text: "Passeie pelo balcão e escolha o que der vontade.", icon: <CupIcon /> },
  { n: "02", title: "Combine", text: "Misture, experimente e crie a sua combinação.", icon: <LayersIcon /> },
  { n: "03", title: "Aproveite", text: "Sente, relaxe e curta o seu momento Berry's.", icon: <SmileIcon /> },
];

export function SelfServiceSection() {
  return (
    <section id="experiencia" aria-labelledby="self-title" className="relative overflow-hidden bg-offwhite py-24 md:py-32">
      <Spot className="absolute -left-40 top-10 size-[420px] text-mist" />
      <div className="container-x relative grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <AnimatedSection>
          <Reveal>
            <p className="eyebrow text-berry-deep">Self-service</p>
          </Reveal>
          <MaskTitle
            lines={["Seu sorvete.", "Do seu jeito."]}
            className="mt-4 text-4xl font-extrabold leading-[1.05] text-navy sm:text-5xl lg:text-[3.6rem]"
          />
          <Reveal>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink/75">
              Aqui, cada visita pode virar uma combinação diferente. A experiência self-service permite que você escolha,
              combine e monte o seu sorvete como preferir.
            </p>
          </Reveal>

          <ol className="mt-10 grid gap-3 sm:grid-cols-3 lg:max-w-xl">
            {steps.map((s) => (
              <Reveal key={s.n} as="li">
                <div className="group h-full rounded-[20px] border border-navy/8 bg-white p-5 shadow-soft transition-all duration-300 ease-out-soft hover:-translate-y-1 hover:shadow-lift">
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-2xl bg-mist text-berry-deep transition-colors duration-300 group-hover:bg-berry group-hover:text-white">
                      {s.icon}
                    </span>
                    <span className="font-display text-xs font-bold tracking-widest text-ink/70">{s.n}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-navy">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink/70">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </AnimatedSection>

        <AnimatedSection className="relative">
          <Reveal>
            <ParallaxImage
              photo={photos.selfService}
              sizes="(min-width: 1024px) 50vw, 100vw"
              zoom
              className="aspect-[4/5] rounded-[32px] shadow-lift sm:aspect-[5/4] lg:aspect-[4/5]"
            />
          </Reveal>
          <Reveal className="absolute -bottom-6 left-5 rounded-2xl bg-white px-5 py-4 shadow-lift sm:-left-6 sm:bottom-10">
            <p className="font-display text-sm font-bold text-navy">Escolha. Combine. Aproveite.</p>
          </Reveal>
        </AnimatedSection>
      </div>
    </section>
  );
}

function CupIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
      <path d="M6 10a6 6 0 0 1 12 0" />
      <path d="M4.5 10h15l-1.6 9.2A2 2 0 0 1 15.9 21H8.1a2 2 0 0 1-2-1.8L4.5 10Z" />
      <path d="M12 4V2.5" />
    </svg>
  );
}
function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </svg>
  );
}
function SmileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01" />
    </svg>
  );
}
