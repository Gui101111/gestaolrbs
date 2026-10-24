import { loadFont } from "@remotion/fonts";
import React from "react";
import {
  AbsoluteFill,
  Easing,
  Html5Audio,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { agrupar, type Palavra } from "./legendas";

loadFont({ family: "Anton", url: staticFile("fonts/Anton-Regular.ttf") });

export type ClipeProps = {
  /** episódio em public/ (ex.: "episodio.mp4") ou URL */
  video: string;
  inicioSeg: number;
  duracaoSeg: number;
  /** PNG da logo do Canal Foco em public/ — obrigatória na campanha */
  logo: string | null;
  /** legendas do episódio em public/: .json3 (YouTube) ou .srt */
  legendas: string | null;
  /** "|" quebra a linha, *texto* vira destaque amarelo */
  manchete: string;
  cta: string;
  ctaSeg: number;
  /** segundos (dentro do trecho) dos jump zooms */
  cortes: number[];
  /** 0 = esquerda, 0.5 = centro, 1 = direita */
  cropX: number;
  efeitos: boolean;
  /** preenchido em calculateMetadata a partir de `legendas` */
  palavras?: Palavra[];
};

const AMARELO = "#FFD400";
const VIDEO_Y = 580;
const VIDEO_ALT = 900;
const LOGO_CENTRO_Y = 470;
const LEGENDA_Y = 1385;
const CTA_Y = 1600;

const src = (caminho: string) =>
  /^https?:\/\//.test(caminho) ? caminho : staticFile(caminho);

const textoBase: React.CSSProperties = {
  fontFamily: "Anton, sans-serif",
  textTransform: "uppercase",
  color: "white",
  WebkitTextStroke: "14px black",
  paintOrder: "stroke fill",
  textShadow: "0 7px 0 rgba(0,0,0,0.45)",
  lineHeight: 1.05,
  letterSpacing: 1,
  whiteSpace: "nowrap",
};

const Fundo: React.FC<{ video: string; trimBefore: number }> = ({ video, trimBefore }) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <OffthreadVideo
      src={src(video)}
      trimBefore={trimBefore}
      muted
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: "scale(1.2)",
        filter: "blur(38px) brightness(0.72) saturate(1.25)",
      }}
    />
  </AbsoluteFill>
);

const JanelaVideo: React.FC<{
  video: string;
  trimBefore: number;
  cortes: number[];
  cropX: number;
  duracao: number;
}> = ({ video, trimBefore, cortes, cropX, duracao }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // zoom de entrada: 1.18 -> 1.0 nos primeiros 0,6 s
  const entrada = interpolate(frame, [0, 0.6 * fps], [0.18, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: "clamp",
  });
  // jump zoom: alterna 1.0 / 1.1 a cada corte, com transição rápida
  const passados = cortes.filter((c) => frame >= c * fps);
  const ultimo = passados.length ? passados[passados.length - 1] * fps : 0;
  const t = spring({ frame: frame - ultimo, fps, durationInFrames: 5, config: { damping: 200 } });
  const ligado = passados.length % 2 === 1;
  const jump = passados.length === 0 ? 0 : ligado ? 0.1 * t : 0.1 * (1 - t);

  return (
    <div
      style={{
        position: "absolute",
        top: VIDEO_Y,
        left: 0,
        width: 1080,
        height: VIDEO_ALT,
        overflow: "hidden",
        borderTop: "4px solid rgba(255,255,255,0.85)",
        boxShadow: "0 0 60px rgba(0,0,0,0.6)",
      }}
    >
      <OffthreadVideo
        src={src(video)}
        trimBefore={trimBefore}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: `${cropX * 100}% 50%`,
          transform: `scale(${1 + entrada + jump})`,
        }}
      />
      <BarraProgresso duracao={duracao} />
    </div>
  );
};

const BarraProgresso: React.FC<{ duracao: number }> = ({ duracao }) => {
  const frame = useCurrentFrame();
  const progresso = Math.min(frame / duracao, 1);
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 10, background: "rgba(0,0,0,0.55)" }}>
      <div style={{ width: `${progresso * 100}%`, height: "100%", background: AMARELO }} />
    </div>
  );
};

// "*R$ 750 MIL*" vira uma tarja amarela que é "pintada" da esquerda para a direita.
const LinhaManchete: React.FC<{ texto: string; atraso: number; tamanho: number; y: number }> = ({
  texto,
  atraso,
  tamanho,
  y,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - atraso, fps, config: { damping: 9, stiffness: 190, mass: 0.6 } });
  const tinta = interpolate(frame, [atraso + 8, atraso + 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const partes = texto.split(/(\*[^*]+\*)/).filter(Boolean);
  return (
    <div
      style={{
        position: "absolute",
        top: y - tamanho * 0.55,
        width: "100%",
        textAlign: "center",
        transform: `scale(${pop})`,
        ...textoBase,
        fontSize: tamanho,
      }}
    >
      {partes.map((p, i) =>
        p.startsWith("*") ? (
          <span key={i} style={{ position: "relative", display: "inline-block", padding: "0 16px" }}>
            <span
              style={{
                position: "absolute",
                inset: "6% 0 2% 0",
                background: AMARELO,
                borderRadius: 12,
                transform: `scaleX(${tinta}) rotate(-1.5deg)`,
                transformOrigin: "left center",
                boxShadow: "0 7px 0 rgba(0,0,0,0.45)",
              }}
            />
            <span
              style={{
                position: "relative",
                color: tinta > 0.5 ? "black" : AMARELO,
                WebkitTextStroke: tinta > 0.5 ? "0px" : "14px black",
                textShadow: tinta > 0.5 ? "none" : textoBase.textShadow,
              }}
            >
              {p.slice(1, -1)}
            </span>
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </div>
  );
};

const Logo: React.FC<{ logo: string | null; ctaInicio: number }> = ({ logo, ctaInicio }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // no CTA a logo "respira" (só cresce, nunca some nem diminui)
  const pulso =
    frame >= ctaInicio ? 1 + 0.06 * Math.abs(Math.sin(((frame - ctaInicio) / fps) * Math.PI * 1.6)) : 1;
  const caixa: React.CSSProperties = {
    position: "absolute",
    top: LOGO_CENTRO_Y - 85,
    width: "100%",
    height: 170,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    transform: `scale(${pulso})`,
  };
  if (!logo) {
    // sem a logo o vídeo não vale na campanha: deixa isso impossível de ignorar
    return (
      <div style={caixa}>
        <div
          style={{
            border: "6px dashed #ff3b30",
            color: "#ff3b30",
            fontFamily: "Anton, sans-serif",
            fontSize: 44,
            padding: "18px 30px",
            background: "rgba(0,0,0,0.6)",
          }}
        >
          COLOQUE A LOGO DO CANAL FOCO (props.logo)
        </div>
      </div>
    );
  }
  return (
    <div style={caixa}>
      <Img src={src(logo)} style={{ maxWidth: 460, maxHeight: 170, objectFit: "contain" }} />
    </div>
  );
};

const Legendas: React.FC<{ palavras: Palavra[]; duracao: number }> = ({ palavras, duracao }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const grupos = React.useMemo(() => agrupar(palavras), [palavras]);

  const idx = grupos.findIndex((g, i) => {
    const fim = Math.min(g[g.length - 1].fimMs + 150, grupos[i + 1]?.[0].iniMs ?? Infinity);
    return ms >= g[0].iniMs && ms < fim;
  });
  if (idx < 0) return null;
  const grupo = grupos[idx];
  const inicioGrupo = Math.round((grupo[0].iniMs / 1000) * fps);
  const entrada = spring({ frame: frame - inicioGrupo, fps, config: { damping: 12, stiffness: 220, mass: 0.5 } });

  return (
    <div
      style={{
        position: "absolute",
        top: LEGENDA_Y - 115,
        width: "100%",
        textAlign: "center",
        ...textoBase,
        fontSize: 100,
        transform: `translateY(${(1 - entrada) * 30}px) scale(${0.75 + 0.25 * entrada})`,
        opacity: frame < duracao ? 1 : 0,
      }}
    >
      {grupo.map((p, i) => {
        const ativa = ms >= p.iniMs && (i === grupo.length - 1 || ms < grupo[i + 1].iniMs);
        const inicioPalavra = Math.round((p.iniMs / 1000) * fps);
        const destaque = ativa
          ? spring({ frame: frame - inicioPalavra, fps, durationInFrames: 4, config: { damping: 200 } })
          : 0;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              margin: "0 20px",
              color: ativa ? AMARELO : "white",
              transform: `scale(${1 + 0.12 * destaque}) rotate(${ativa ? -2 * destaque : 0}deg)`,
            }}
          >
            {p.texto}
          </span>
        );
      })}
    </div>
  );
};

const Cta: React.FC<{ texto: string }> = ({ texto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrada = spring({ frame, fps, config: { damping: 10, stiffness: 160, mass: 0.7 } });
  const balanco = frame > 12 ? Math.sin((frame - 12) / 3.2) * 2.2 : 0;
  return (
    <div
      style={{
        position: "absolute",
        top: CTA_Y - 60,
        width: "100%",
        display: "flex",
        justifyContent: "center",
        transform: `translateY(${(1 - entrada) * 250}px) scale(${entrada}) rotate(${balanco}deg)`,
      }}
    >
      <div
        style={{
          background: AMARELO,
          color: "black",
          fontFamily: "Anton, sans-serif",
          fontSize: 72,
          lineHeight: 1.1,
          padding: "14px 36px",
          borderRadius: 18,
          boxShadow: "0 10px 0 rgba(0,0,0,0.5)",
          whiteSpace: "nowrap",
        }}
      >
        {texto}
      </div>
    </div>
  );
};

const Flash: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacidade = interpolate(frame, [0, 0.35 * fps], [1, 0], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: "white", opacity: opacidade }} />;
};

export const ClipeCanalFoco: React.FC<ClipeProps> = (props) => {
  const { fps, durationInFrames } = useVideoConfig();
  const trimBefore = Math.round(props.inicioSeg * fps);
  const ctaInicio = Math.max(durationInFrames - Math.round(props.ctaSeg * fps), Math.round(3.2 * fps));
  const linhas = props.manchete.split("|").map((l) => l.trim()).filter(Boolean).slice(0, 2);

  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Fundo video={props.video} trimBefore={trimBefore} />
      <JanelaVideo
        video={props.video}
        trimBefore={trimBefore}
        cortes={props.cortes}
        cropX={props.cropX}
        duracao={durationInFrames}
      />
      {linhas.map((l, i) => (
        <LinhaManchete
          key={i}
          texto={l}
          atraso={2 + i * 7}
          tamanho={i === 1 ? 100 : 82}
          y={linhas.length === 1 ? 262 : i === 0 ? 190 : 312}
        />
      ))}
      <Logo logo={props.logo} ctaInicio={ctaInicio} />
      <Legendas palavras={props.palavras ?? []} duracao={durationInFrames} />
      {props.cta ? (
        <Sequence from={ctaInicio} layout="none">
          <Cta texto={props.cta} />
        </Sequence>
      ) : null}
      <Flash />
      {props.efeitos ? (
        <>
          <Html5Audio src={staticFile("sfx/whoosh.wav")} volume={0.35} />
          <Sequence from={ctaInicio} layout="none">
            <Html5Audio src={staticFile("sfx/whoosh.wav")} volume={0.35} />
          </Sequence>
        </>
      ) : null}
    </AbsoluteFill>
  );
};
