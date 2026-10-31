import { AbsoluteFill, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { sceneAt, track } from "../data/scenes";
import { FONT, PALETTE } from "../theme";
import { clamp } from "../utils/animation";

// Efeitos 2D de ritmo: flash de impacto, linhas de velocidade, rastro de "chicote", palavras gigantes,
// raio-x da mão, ícone de compartilhar e cartão final. Tudo função pura do frame.

export const Flash: React.FC = () => {
  const v = clamp(track("flash", useCurrentFrame()), 0, 1);
  return v > 0.01 ? <AbsoluteFill style={{ background: "#ffffff", opacity: v * 0.85, pointerEvents: "none" }} /> : null;
};

export const SpeedLines: React.FC = () => {
  const frame = useCurrentFrame();
  const v = clamp(track("speed", frame), 0, 1);
  if (v < 0.01) return null;
  const lines = Array.from({ length: 44 }, (_, i) => {
    const a = (i / 44) * Math.PI * 2 + random(`a${i}`) * 0.12;
    const r0 = 420 + random(`r${i}-${Math.floor(frame / 2)}`) * 260;
    const len = 300 + random(`l${i}-${Math.floor(frame / 2)}`) * 500;
    const w = 4 + random(`w${i}`) * 10;
    return (
      <line
        key={i}
        x1={540 + Math.cos(a) * r0}
        y1={900 + Math.sin(a) * r0}
        x2={540 + Math.cos(a) * (r0 + len)}
        y2={900 + Math.sin(a) * (r0 + len)}
        stroke="#ffffff"
        strokeWidth={w}
        strokeLinecap="round"
        opacity={0.55}
      />
    );
  });
  return (
    <AbsoluteFill style={{ opacity: v, pointerEvents: "none" }}>
      <svg width={1080} height={1920}>{lines}</svg>
    </AbsoluteFill>
  );
};

export const WhipStreaks: React.FC = () => {
  const frame = useCurrentFrame();
  const v = clamp(track("whip", frame), 0, 1);
  if (v < 0.01) return null;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        opacity: v * 0.7,
        background: `repeating-linear-gradient(0deg, rgba(255,255,255,0.0) 0px, rgba(255,255,255,0.0) 22px, rgba(255,255,255,0.35) 24px, rgba(255,255,255,0.0) 30px)`,
        transform: `translateX(${((frame * 140) % 400) - 200}px) scaleX(1.4)`,
      }}
    />
  );
};

/** Palavras gigantes que "pulam" no centro da tela (dados em scene.bigWords, frames locais). */
export const BigWords: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sc = sceneAt(frame);
  const local = frame - sc.startFrame;
  const out: React.ReactNode[] = [];
  (sc.bigWords ?? []).forEach((w, i) => {
    if (local < w.at || local >= w.until) return;
    const enter = spring({ frame: local - w.at, fps, config: { damping: 9, stiffness: 180, mass: 0.6 } });
    const exit = clamp((local - (w.until - 6)) / 6, 0, 1);
    const scale = interpolate(enter, [0, 1], [0.2, 1]) * (1 + 0.35 * exit);
    const wobble = Math.sin((local - w.at) / 3) * 2 * (1 - clamp((local - w.at) / 20, 0, 1));
    out.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: w.y ?? 700,
          display: "flex",
          justifyContent: "center",
          opacity: clamp(enter * 2, 0, 1) * (1 - exit),
          scale: String(scale),
          rotate: `${(w.tilt ?? -4) + wobble}deg`,
        }}
      >
        <span
          style={{
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: w.size ?? 130,
            color: w.color ?? "#ffffff",
            WebkitTextStroke: `16px ${PALETTE.outline}`,
            paintOrder: "stroke fill",
            textShadow: "0 14px 0 rgba(0,0,0,0.25), 0 20px 40px rgba(0,0,0,0.35)",
            letterSpacing: 2,
            whiteSpace: "nowrap",
          }}
        >
          {w.text}
        </span>
      </div>,
    );
  });
  return <AbsoluteFill style={{ pointerEvents: "none" }}>{out}</AbsoluteFill>;
};

/** Raio-x estilizado da mão, com fratura piscando em vermelho. */
export const XRay: React.FC = () => {
  const frame = useCurrentFrame();
  const v = clamp(track("xray", frame), 0, 1.2);
  const crack = clamp(track("xray.crack", frame), 0, 1);
  if (v < 0.01) return null;
  const bone = "#e8f4ff";
  const fingers = [
    { x: 330, len: [90, 60, 45] },
    { x: 410, len: [110, 70, 50] },
    { x: 490, len: [115, 75, 52] },
    { x: 570, len: [105, 68, 48] },
    { x: 645, len: [85, 55, 40] },
  ];
  const blink = 0.55 + 0.45 * Math.abs(Math.sin(frame / 3));
  return (
    <AbsoluteFill style={{ pointerEvents: "none", alignItems: "center", justifyContent: "flex-start" }}>
      <div
        style={{
          marginTop: 440,
          width: 760,
          height: 860,
          borderRadius: 40,
          background: "radial-gradient(ellipse at 50% 45%, #1b3a66 0%, #0a1a33 70%)",
          border: "8px solid #9fd3ff",
          boxShadow: "0 30px 60px rgba(0,0,0,0.45), 0 0 40px rgba(120,190,255,0.45)",
          scale: String(clamp(v, 0, 1.2)),
          rotate: `${(1 - clamp(v, 0, 1)) * -10}deg`,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <svg width={760} height={860} viewBox="0 0 980 1100" style={{ position: "absolute", left: 0, top: 0 }}>
          {/* punho e metacarpos */}
          <rect x={360} y={760} width={260} height={260} rx={70} fill={bone} opacity={0.25} />
          {fingers.map((f, i) => (
            <g key={i}>
              <rect x={f.x - 22 + (i === 0 ? -20 : 0)} y={i === 0 ? 560 : 520} width={44} height={i === 0 ? 170 : 230} rx={20} fill={bone} opacity={0.9} transform={i === 0 ? `rotate(-28 ${f.x} 700)` : undefined} />
              {(i === 0 ? f.len.slice(0, 2) : f.len).map((l, k) => {
                const y0 = (i === 0 ? 520 : 510) - f.len.slice(0, k + 1).reduce((a, b) => a + b + 12, 0);
                return <rect key={k} x={f.x - 18 + (i === 0 ? -95 : 0)} y={y0} width={36} height={l} rx={16} fill={bone} opacity={0.92} transform={i === 0 ? `rotate(-28 ${f.x} 700)` : undefined} />;
              })}
            </g>
          ))}
          {/* fratura */}
          {crack > 0.01 ? (
            <g opacity={crack * blink}>
              <circle cx={455} cy={600} r={95} fill="none" stroke="#ff3b3b" strokeWidth={14} />
              <path d="M415 585 L445 610 L430 625 L470 640 L455 655 L495 668" fill="none" stroke="#ff3b3b" strokeWidth={12} strokeLinejoin="round" />
            </g>
          ) : null}
        </svg>
        <div style={{ position: "absolute", top: 26, left: 0, right: 0, textAlign: "center", fontFamily: FONT, fontWeight: 900, fontSize: 54, color: "#9fd3ff", letterSpacing: 6 }}>RAIO-X</div>
      </div>
    </AbsoluteFill>
  );
};

/** Botão de compartilhar gigante (fim do vídeo). */
export const ShareIcon: React.FC = () => {
  const frame = useCurrentFrame();
  const v = clamp(track("share", frame), 0, 1.2);
  if (v < 0.01) return null;
  const pulse = 1 + 0.05 * Math.sin(frame / 4);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", alignItems: "center" }}>
      <div
        style={{
          marginTop: 560,
          width: 300,
          height: 300,
          borderRadius: 150,
          background: "linear-gradient(180deg, #2ee07a 0%, #18a854 100%)",
          border: "10px solid #ffffff",
          boxShadow: "0 24px 50px rgba(0,0,0,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          scale: String(clamp(v, 0, 1.2) * pulse),
        }}
      >
        <svg width={170} height={170} viewBox="0 0 100 100">
          <line x1={30} y1={50} x2={70} y2={25} stroke="#fff" strokeWidth={8} />
          <line x1={30} y1={50} x2={70} y2={75} stroke="#fff" strokeWidth={8} />
          <circle cx={30} cy={50} r={13} fill="#fff" />
          <circle cx={72} cy={24} r={13} fill="#fff" />
          <circle cx={72} cy={76} r={13} fill="#fff" />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

/** Cartão final com a marca do canal. */
export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const v = clamp(track("endcard", frame), 0, 1.2);
  if (v < 0.01) return null;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, #2a5bd0 0%, #163a8f 40%, #071634 100%)`, opacity: clamp(v * 2, 0, 1), alignItems: "center", justifyContent: "center" }}>
      <Img src={staticFile("brand.png")} style={{ width: 760, height: 760, borderRadius: 380, scale: String(0.6 + 0.4 * clamp(v, 0, 1.2)), boxShadow: "0 30px 70px rgba(0,0,0,0.45)" }} />
      <div style={{ marginTop: 50, fontFamily: FONT, fontWeight: 700, fontSize: 36, color: "rgba(255,255,255,0.85)", opacity: clamp(v, 0, 1) }}>Conteúdo informativo</div>
    </AbsoluteFill>
  );
};
