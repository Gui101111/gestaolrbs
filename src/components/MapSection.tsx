"use client";

import { useState } from "react";
import { business, mapsEmbedUrl, mapsSearchUrl } from "@/data/business";
import { AnimatedSection, Reveal } from "./AnimatedSection";

/**
 * Mapa do Google por pesquisa de endereço (sem API key).
 * O iframe só carrega após o clique ou quando o usuário chega perto (loading="lazy"),
 * para não pesar o carregamento inicial.
 */
export function MapSection({ embedUrl = mapsEmbedUrl }: { embedUrl?: string }) {
  const [active, setActive] = useState(false);
  return (
    <AnimatedSection className="mt-16 md:mt-24">
      <Reveal className="relative h-[320px] overflow-hidden rounded-[28px] bg-mist shadow-soft md:h-[430px]">
        <iframe
          title={`Mapa: ${business.fullName}, ${business.address.street}, ${business.address.city}`}
          src={embedUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 size-full border-0"
          style={{ pointerEvents: active ? "auto" : "none" }}
        />
        {!active && (
          <button
            type="button"
            onClick={() => setActive(true)}
            className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-navy/25 to-transparent p-5 text-left"
            aria-label="Ativar interação com o mapa"
          >
            <span className="rounded-full bg-white px-5 py-2.5 font-display text-sm font-bold text-navy shadow-lift">
              Toque para interagir com o mapa
            </span>
          </button>
        )}
      </Reveal>
      <p className="mt-4 text-center text-sm text-ink/70">
        Não carregou?{" "}
        <a href={mapsSearchUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-berry-deep underline underline-offset-4">
          Abrir no Google Maps
        </a>
      </p>
    </AnimatedSection>
  );
}
