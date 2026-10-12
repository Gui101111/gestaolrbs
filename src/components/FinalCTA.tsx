import { mapsSearchUrl, whatsappUrl } from "@/data/business";
import { AnimatedSection, MaskTitle, Reveal } from "./AnimatedSection";
import { ButtonLink } from "./Button";
import { WhatsAppIcon } from "./icons";
import { Spot } from "./Blobs";

export function FinalCTA() {
  return (
    <section id="contato" aria-labelledby="cta-title" className="bg-white px-4 pb-24 md:px-8 md:pb-32">
      <div className="on-dark relative mx-auto max-w-[1240px] overflow-hidden rounded-[36px] bg-berry-deep px-6 py-20 text-center text-white sm:px-12 md:py-28">
        <Spot className="absolute -left-16 -top-16 size-64 text-white/10" variant={1} />
        <Spot className="absolute -bottom-20 -right-10 size-72 text-berry/45" variant={0} />
        <Spot className="absolute right-[18%] top-10 hidden size-14 text-white/20 md:block" variant={2} />
        <ConeDoodle className="absolute left-[8%] top-1/2 hidden h-28 -translate-y-1/2 -rotate-12 text-white/25 lg:block" />
        <ConeDoodle className="absolute bottom-10 right-[9%] hidden h-20 rotate-12 text-white/25 lg:block" />

        <AnimatedSection className="relative mx-auto max-w-2xl">
          <Reveal>
            <p className="eyebrow">Bateu vontade?</p>
          </Reveal>
          <MaskTitle
            lines={["Seu próximo sorvete", "pode começar por aqui."]}
            className="mt-5 text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl"
          />
          <Reveal>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href={mapsSearchUrl} external variant="white" arrow>
                Como chegar
              </ButtonLink>
              <ButtonLink href={whatsappUrl()} external variant="outline-light" icon={<WhatsAppIcon className="size-[18px]" />}>
                WhatsApp
              </ButtonLink>
            </div>
          </Reveal>
        </AnimatedSection>
      </div>
    </section>
  );
}

function ConeDoodle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 72" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M8 26a12 12 0 0 1 24 0" />
      <path d="M6 26h28L20 68 6 26Z" />
      <path d="M12 38l12 12M18 30l12 12M28 38 16 50" opacity=".6" />
    </svg>
  );
}
