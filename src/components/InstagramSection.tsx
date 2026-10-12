import Image from "next/image";
import { business } from "@/data/business";
import { photos } from "@/data/images";
import { AnimatedSection, MaskTitle, Reveal } from "./AnimatedSection";
import { InstagramIcon } from "./icons";

const grid = [photos.toppings, photos.interior, photos.copos, photos.selfService, photos.fachada, photos.ambiente];

export function InstagramSection() {
  return (
    <section aria-labelledby="insta-title" className="overflow-hidden bg-white py-24 md:py-32">
      <div className="container-x grid items-center gap-12 lg:grid-cols-12">
        <AnimatedSection className="lg:col-span-5">
          <Reveal>
            <p className="eyebrow inline-flex items-center gap-2 text-berry-deep">
              <InstagramIcon className="size-4" /> {business.instagram}
            </p>
          </Reveal>
          <MaskTitle
            lines={["Do feed para o seu", "próximo sorvete."]}
            className="mt-4 text-4xl font-extrabold leading-[1.05] text-navy sm:text-5xl"
          />
          <Reveal>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink/75">
              Acompanhe as novidades, os bastidores e os momentos Berry&apos;s por lá.
            </p>
          </Reveal>
          <Reveal>
            <a
              href={business.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-8 inline-flex min-h-12 items-center gap-3 rounded-[14px] bg-gradient-to-r from-berry-deep to-berry px-6 py-3 font-display font-bold text-white shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
            >
              <InstagramIcon className="size-5" />
              Seguir no Instagram
              <svg viewBox="0 0 20 20" fill="none" className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
                <path d="M4 10h11m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </Reveal>
        </AnimatedSection>

        <AnimatedSection gap={0.07} className="grid grid-cols-3 gap-2 sm:gap-3 lg:col-span-7">
          {grid.map((p, i) => (
            <Reveal key={p.src + i}>
              <a
                href={business.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Ver mais fotos no Instagram ${business.instagram}`}
                className="group relative block aspect-square overflow-hidden rounded-[16px] bg-mist"
              >
                <Image src={p.src} alt="" fill sizes="(min-width: 1024px) 20vw, 33vw" className="object-cover transition-transform duration-700 ease-out-soft group-hover:scale-110" />
                <span className="absolute inset-0 grid place-items-center bg-berry-deep/0 text-white opacity-0 transition-all duration-300 group-hover:bg-berry-deep/45 group-hover:opacity-100">
                  <InstagramIcon className="size-7" />
                </span>
              </a>
            </Reveal>
          ))}
        </AnimatedSection>
      </div>
    </section>
  );
}
