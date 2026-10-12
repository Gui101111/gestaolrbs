import { photos } from "@/data/images";
import { AnimatedSection, MaskTitle, Reveal } from "./AnimatedSection";
import { ParallaxImage } from "./ParallaxImage";
import { ButtonLink } from "./Button";
import { FloatingBits } from "./FloatingBits";

export function ToppingsSection() {
  return (
    <section aria-labelledby="toppings-title" className="relative overflow-hidden bg-white py-24 md:py-32">
      <div aria-hidden="true" className="absolute -right-32 top-1/2 size-[520px] -translate-y-1/2 rounded-full border-[40px] border-mist" />
      <FloatingBits />
      <div className="container-x relative">
        <div className="relative lg:grid lg:grid-cols-12 lg:items-center">
          <AnimatedSection className="lg:col-span-7 lg:col-start-1 lg:row-start-1">
            <Reveal>
              <ParallaxImage
                photo={photos.toppings}
                sizes="(min-width: 1024px) 60vw, 100vw"
                strength={50}
                className="aspect-[4/3] rounded-[32px] shadow-lift lg:aspect-[5/4]"
              />
            </Reveal>
          </AnimatedSection>

          <AnimatedSection className="relative z-10 -mt-16 px-3 sm:px-8 lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:-ml-16 lg:mt-0 lg:px-0">
            <Reveal className="rounded-[24px] bg-mist p-8 shadow-lift ring-1 ring-white sm:p-10 lg:p-12">
              <p className="font-script text-2xl text-berry-deep sm:text-3xl">monte do seu jeito</p>
              <MaskTitle
                lines={["Cada detalhe deixa", "tudo ainda melhor."]}
                className="mt-1 text-[1.7rem] font-extrabold leading-[1.1] text-navy sm:text-4xl"
              />
              <p className="mt-5 text-lg leading-relaxed text-ink/75">
                Uma experiência cheia de possibilidades para você criar a combinação que mais combina com o seu momento.
              </p>
              <div className="mt-8">
                <ButtonLink href="#galeria" variant="primary" arrow>
                  Ver a experiência
                </ButtonLink>
              </div>
            </Reveal>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
