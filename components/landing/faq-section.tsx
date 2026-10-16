"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SectionHeading } from "@/components/landing/section-heading";
import { Reveal } from "@/components/animations/reveal";

const FAQ = [
  {
    q: "Preciso saber editar vídeos?",
    a: "Não. Você envia o vídeo gravado, responde algumas perguntas simples (objetivo, área, estilo e formato) e a plataforma cuida do restante. Não há linha do tempo nem ferramentas complexas.",
  },
  {
    q: "O conteúdo respeita o Provimento 205/2021 da OAB?",
    a: "Os estilos são sóbrios por padrão e a revisão de conformidade sinaliza falas com promessa de resultado ou captação indevida. A responsabilidade pelo conteúdo permanece com o advogado — a plataforma é uma ferramenta de edição.",
  },
  {
    q: "Quais formatos de vídeo posso enviar?",
    a: "MP4, MOV e WEBM, gravados no celular ou em câmera. O envio é retomável: se a conexão cair, ele continua de onde parou.",
  },
  {
    q: "Em quais formatos recebo o vídeo pronto?",
    a: "Você escolhe as plataformas — Reels, TikTok, Shorts, Stories, Feed, Meta Ads, YouTube e LinkedIn — e recebe MP4 nas proporções 9:16, 1:1, 4:5 e 16:9, conforme a escolha.",
  },
  {
    q: "Meus vídeos ficam seguros?",
    a: "Sim. Os arquivos ficam em armazenamento privado, acessível somente por você através de links temporários. Você pode excluir projetos e sua conta a qualquer momento, conforme a LGPD.",
  },
  {
    q: "Posso aplicar a identidade visual do meu escritório?",
    a: "Sim. Em “Minha Marca” você salva logotipo, cores, fonte, site, Instagram, WhatsApp e nome profissional. Essas informações podem ser aplicadas automaticamente nos vídeos.",
  },
  {
    q: "E se eu quiser mudar algo no vídeo final?",
    a: "Você pode solicitar ajustes indicando o momento do vídeo, criar uma nova versão com outras configurações ou duplicar o projeto. A quantidade de ajustes por vídeo depende do plano.",
  },
  {
    q: "Posso cancelar a assinatura quando quiser?",
    a: "Sim, sem fidelidade. O acesso permanece até o fim do ciclo já pago.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="relative py-28 md:py-40">
      <div className="mx-auto grid max-w-7xl gap-14 px-6 md:px-10 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeading
          eyebrow="Dúvidas"
          title="Perguntas"
          highlight="frequentes."
          description="Não encontrou sua resposta? Fale com a nossa equipe pelo e-mail de suporte."
        />
        <Reveal delay={0.15}>
          <Accordion type="single" collapsible className="border-t border-fg/[0.07]">
            {FAQ.map((f, i) => (
              <AccordionItem key={f.q} value={`q-${i}`}>
                <AccordionTrigger>{f.q}</AccordionTrigger>
                <AccordionContent>{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
