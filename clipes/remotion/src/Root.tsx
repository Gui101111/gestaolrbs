import React from "react";
import { Composition, staticFile } from "remotion";
import { ClipeCanalFoco, type ClipeProps } from "./ClipeCanalFoco";
import { carregarPalavras } from "./legendas";

const FPS = 30;

const padrao: ClipeProps = {
  video: "episodio.mp4",
  inicioSeg: 0,
  duracaoSeg: 30,
  logo: null,
  legendas: null,
  manchete: "5 MILIONÁRIOS x 5 NOVATOS|DISPUTAM *R$ 750 MIL*",
  cta: "▶ EPISÓDIO COMPLETO NO YOUTUBE",
  ctaSeg: 3.5,
  cortes: [],
  cropX: 0.5,
  videoAlt: 608,
  videoY: 610,
  zoomBase: 1,
  origemY: 50,
  efeitos: true,
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="ClipeCanalFoco"
    component={ClipeCanalFoco}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={30 * FPS}
    defaultProps={padrao}
    calculateMetadata={async ({ props }) => {
      if (props.duracaoSeg < 15) {
        throw new Error("A campanha exige no mínimo 15 segundos (duracaoSeg).");
      }
      const legendas = props.legendas;
      const palavras = legendas
        ? await carregarPalavras(
            /^https?:\/\//.test(legendas) ? legendas : staticFile(legendas),
            props.inicioSeg,
            props.duracaoSeg,
          )
        : [];
      return {
        durationInFrames: Math.round(props.duracaoSeg * FPS),
        props: { ...props, palavras },
      };
    }}
  />
);
