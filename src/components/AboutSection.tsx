import Image from "next/image";
import { photos } from "@/data/images";
import { AnimatedSection, MaskTitle, Reveal } from "./AnimatedSection";
import { Spot, Wave } from "./Blobs";

export function AboutSection() {
  return (
    <section id="a-berrys" aria-labelledby="about-title" className="on-dark relative overflow-hidden bg-berry-deep text-white">
      <Wave className="h-10 text-white md:h-16" flip />
      {/* manchas inspiradas na arte original da marca */}
      <Spot className="absolute -left-24 top-24 size-72 text-white/10" variant={0} />
      <Spot className="absolute bottom-10 left-1/3 size-40 text-berry/50" variant={2} />
      <Spot className="absolute -right-16 bottom-0 size-80 text-berry/45" variant={1} />

      <div className="container-x relative grid items-center gap-14 py-20 md:py-28 lg:grid-cols-2 lg:gap-20">
        <AnimatedSection>
          <Reveal>
            <p className="eyebrow inline-flex rounded-full bg-navy/50 px-4 py-2">Uma experiência Berry&apos;s</p>
          </Reveal>
          <MaskTitle
            lines={["De Minas Gerais", "para Porto Seguro."]}
            className="mt-6 text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-[3.5rem]"
          />
          <Reveal>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white">
              Chegamos diretamente de Minas Gerais para adoçar os seus dias com o melhor sorvete artesanal.
            </p>
          </Reveal>
          <Reveal>
            <p className="mt-4 max-w-lg leading-relaxed text-white">
              O jeitinho mineiro de receber bem, agora no coração de Porto Seguro: sorvete feito com carinho, um espaço
              leve e aquele momento gostoso para dividir com quem você gosta.
            </p>
          </Reveal>
        </AnimatedSection>

        <AnimatedSection className="relative mx-auto w-full max-w-md lg:max-w-none">
          <Reveal className="relative">
            <div className="relative mx-auto aspect-square w-[85%] overflow-hidden rounded-[46%_54%_42%_58%/52%_44%_56%_48%] shadow-[0_40px_80px_-30px_rgb(11_70_105/0.7)] ring-8 ring-white/20">
              <Image src={photos.copos.src} alt={photos.copos.alt} fill sizes="(min-width: 1024px) 40vw, 85vw" className="object-cover" />
            </div>
            <Spot className="absolute -right-2 top-4 size-24 text-white" variant={1} />
            <Spot className="absolute bottom-2 left-0 size-16 text-navy" variant={2} />
            <span className="absolute bottom-[12%] right-0 rounded-2xl bg-white px-4 py-3 font-display text-sm font-bold text-navy shadow-lift">
              De Minas para Porto Seguro 💙
            </span>
          </Reveal>
        </AnimatedSection>
      </div>
      <Wave className="h-10 text-offwhite md:h-16" />
    </section>
  );
}
