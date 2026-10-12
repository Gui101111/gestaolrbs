import { business, mapsSearchUrl, whatsappUrl } from "@/data/business";
import { photos } from "@/data/images";
import { AnimatedSection, MaskTitle, Reveal } from "./AnimatedSection";
import { ParallaxImage } from "./ParallaxImage";
import { ButtonLink } from "./Button";
import { WhatsAppIcon } from "./icons";
import { MapSection } from "./MapSection";

export function LocationSection() {
  const { address } = business;
  return (
    <section id="localizacao" aria-labelledby="location-title" className="relative bg-offwhite py-24 md:py-32">
      <div className="container-x">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <AnimatedSection>
            <Reveal>
              <ParallaxImage
                photo={photos.fachada}
                sizes="(min-width: 1024px) 50vw, 100vw"
                zoom
                strength={30}
                className="aspect-[4/5] rounded-[32px] shadow-lift sm:aspect-[4/3] lg:aspect-[4/5]"
              />
            </Reveal>
          </AnimatedSection>

          <AnimatedSection>
            <Reveal>
              <p className="eyebrow text-berry-deep">Vem conhecer</p>
            </Reveal>
            <MaskTitle
              lines={["Tem Berry's", "esperando por você", "em Porto Seguro."]}
              className="mt-4 text-4xl font-extrabold leading-[1.05] text-navy sm:text-5xl"
            />
            <Reveal>
              <address className="mt-8 flex gap-4 rounded-[20px] bg-white p-6 not-italic shadow-soft">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-berry text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden="true">
                    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" strokeLinejoin="round" />
                    <circle cx="12" cy="9.5" r="2.5" />
                  </svg>
                </span>
                <span className="text-lg leading-relaxed text-ink/80">
                  <strong className="block font-display text-navy">{address.street}</strong>
                  {address.district}
                  <br />
                  {address.city} – {address.state}
                </span>
              </address>
            </Reveal>
            <Reveal>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href={mapsSearchUrl} external variant="primary" arrow icon={<MapIcon />}>
                  Abrir no mapa
                </ButtonLink>
                <ButtonLink href={whatsappUrl()} external variant="whatsapp" icon={<WhatsAppIcon className="size-[18px]" />}>
                  Falar no WhatsApp
                </ButtonLink>
              </div>
            </Reveal>
          </AnimatedSection>
        </div>

        <MapSection />
      </div>
    </section>
  );
}

function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="size-[18px]" aria-hidden="true">
      <path d="m9 4-6 2.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Z" />
      <path d="M9 4v13.5M15 6.5V20" />
    </svg>
  );
}
