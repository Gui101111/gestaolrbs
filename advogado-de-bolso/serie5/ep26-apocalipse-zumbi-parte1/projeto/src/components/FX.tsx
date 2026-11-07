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
            fontSize: Math.min(w.size ?? 130, Math.floor(980 / (0.8 * Math.max(1, w.text.length)))),
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

/** Confete caindo (trilha "confetti" 0..1 controla a intensidade). */
export const Confetti: React.FC = () => {
  const frame = useCurrentFrame();
  const v = clamp(track("confetti", frame), 0, 1);
  if (v < 0.01) return null;
  const colors = ["#ffd43b", "#4be37f", "#ff5d8f", "#4fdcff", "#ffffff", "#ff9f1c", "#b388ff"];
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: Math.min(1, v * 1.4) }}>
      <svg width={1080} height={1920}>
        {Array.from({ length: Math.round(90 * v) }, (_, i) => {
          const sp = 9 + random(`cs${i}`) * 9;
          const x = random(`cx${i}`) * 1080 + Math.sin(frame / 9 + i) * 30;
          const y = ((random(`cy${i}`) * 2100 + frame * sp) % 2100) - 120;
          const r = (frame * (4 + random(`cr${i}`) * 8) + i * 40) % 360;
          const w = 14 + random(`cw${i}`) * 14;
          return <rect key={i} x={x} y={y} width={w} height={w * 0.5} fill={colors[i % colors.length]} transform={`rotate(${r} ${x + w / 2} ${y + w / 4})`} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

/** Celular 2D com o "grupo da família": mensagens surgindo + carimbo FAKE (dados em scene.chat, frames locais). */
export const ChatOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sc = sceneAt(frame);
  const c = sc.chat;
  if (!c) return null;
  const local = frame - sc.startFrame;
  if (local < c.at || local >= c.until) return null;
  const enter = spring({ frame: local - c.at, fps, config: { damping: 12, stiffness: 160, mass: 0.7 } });
  const exit = clamp((local - (c.until - 8)) / 8, 0, 1);
  const stampT = c.fakeAt !== undefined && local >= c.fakeAt ? spring({ frame: local - c.fakeAt, fps, config: { damping: 10, stiffness: 220, mass: 0.6 } }) : 0;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", alignItems: "center" }}>
      <div
        style={{
          marginTop: c.y ?? 300,
          width: 800,
          borderRadius: 40,
          overflow: "hidden",
          background: "#ece5dd",
          border: "8px solid #111",
          boxShadow: "0 30px 60px rgba(0,0,0,0.45)",
          opacity: clamp(enter * 2, 0, 1) * (1 - exit),
          scale: String(interpolate(enter, [0, 1], [0.6, 1]) * (1 - 0.1 * exit)),
          rotate: `${-2 + 2 * enter}deg`,
          fontFamily: FONT,
        }}
      >
        <div style={{ background: "#1f6f5c", padding: "20px 28px", display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 70, height: 70, borderRadius: 35, background: "#cfd8dc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, fontWeight: 900, color: "#1f6f5c" }}>{c.title.slice(0, 1)}</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: 40 }}>{c.title}</div>
            <div style={{ color: "#c8efe4", fontWeight: 700, fontSize: 26 }}>{c.subtitle ?? "Tia Cida, Tio Zé, Vó, +23"}</div>
          </div>
        </div>
        <div style={{ padding: "22px 24px 30px", display: "flex", flexDirection: "column", gap: 16, minHeight: 200 }}>
          {c.msgs.map((m, i) => {
            if (local < m.at) return null;
            const s = spring({ frame: local - m.at, fps, config: { damping: 11, stiffness: 200, mass: 0.6 } });
            return (
              <div
                key={i}
                style={{
                  alignSelf: m.me ? "flex-end" : "flex-start",
                  maxWidth: 640,
                  background: m.me ? "#d9fdd3" : "#ffffff",
                  borderRadius: 24,
                  padding: "14px 22px 16px",
                  boxShadow: "0 3px 0 rgba(0,0,0,0.12)",
                  scale: String(interpolate(s, [0, 1], [0.4, 1])),
                  opacity: clamp(s * 2, 0, 1),
                  transformOrigin: m.me ? "right top" : "left top",
                }}
              >
                {m.fwd ? <div style={{ color: "#8a8f94", fontSize: 22, fontWeight: 700, fontStyle: "italic" }}>↪ Encaminhada com frequência</div> : null}
                {!m.me ? <div style={{ color: m.color ?? "#d35400", fontWeight: 900, fontSize: 28 }}>{m.who}</div> : null}
                <div style={{ color: "#111b21", fontWeight: 800, fontSize: 38, lineHeight: 1.15 }}>{m.text}</div>
              </div>
            );
          })}
        </div>
      </div>
      {stampT > 0.001 ? (
        <div
          style={{
            position: "absolute",
            top: (c.y ?? 300) + 170,
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 170,
            color: c.stampColor ?? "#e53935",
            border: `14px solid ${c.stampColor ?? "#e53935"}`,
            borderRadius: 30,
            padding: "0 40px",
            background: "rgba(255,255,255,0.82)",
            rotate: "-14deg",
            scale: String(interpolate(stampT, [0, 1], [2.6, 1])),
            opacity: clamp(stampT * 1.5, 0, 1) * (1 - exit),
            letterSpacing: 6,
          }}
        >
          {c.stamp ?? "FAKE"}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** Chamada final para comentar (balão) e seguir nas redes (trilhas "comment" e "follow"). */
export const CommentCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const v = clamp(track("comment", frame), 0, 1.2);
  const f = clamp(track("follow", frame), 0, 1.2);
  if (v < 0.01 && f < 0.01) return null;
  const pulse = 1 + 0.05 * Math.sin(frame / 4);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", alignItems: "center" }}>
      {v > 0.01 ? (
        <div
          style={{
            marginTop: 470,
            width: 290,
            height: 290,
            borderRadius: 145,
            background: "linear-gradient(180deg, #ff9f1c 0%, #ff5d5d 100%)",
            border: "10px solid #ffffff",
            boxShadow: "0 24px 50px rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            scale: String(v * pulse),
          }}
        >
          <svg width={170} height={170} viewBox="0 0 100 100">
            <path d="M14 18 H86 Q92 18 92 24 V66 Q92 72 86 72 H44 L24 88 L28 72 H14 Q8 72 8 66 V24 Q8 18 14 18 Z" fill="#ffffff" />
            {[30, 50, 70].map((x, i) => (
              <circle key={x} cx={x} cy={45} r={7} fill="#ff6b3d" opacity={0.5 + 0.5 * Math.abs(Math.sin(frame / 6 + i))} />
            ))}
          </svg>
        </div>
      ) : null}
      {v > 0.01 ? (
        <div style={{ marginTop: 22, fontFamily: FONT, fontWeight: 900, fontSize: 92, color: "#ffffff", WebkitTextStroke: `14px ${PALETTE.outline}`, paintOrder: "stroke fill", scale: String(v), rotate: "-3deg" }}>COMENTA AÍ!</div>
      ) : null}
      {f > 0.01 ? (
        <div
          style={{
            position: "absolute",
            top: 1060,
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "18px 34px",
            borderRadius: 60,
            background: "#ffffff",
            boxShadow: "0 16px 30px rgba(0,0,0,0.3)",
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 46,
            color: "#1d2b45",
            scale: String(f),
          }}
        >
          <span style={{ width: 64, height: 64, borderRadius: 32, background: "#ff3d6e", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 54 }}>+</span>
          SIGA EM TODAS AS REDES
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** Corações subindo (trilha "hearts" 0..1) — momentos fofos. */
export const Hearts: React.FC = () => {
  const frame = useCurrentFrame();
  const v = clamp(track("hearts", frame), 0, 1);
  if (v < 0.01) return null;
  const colors = ["#ff5d8f", "#ff8fab", "#ff3d6e", "#ffc2d1"];
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: Math.min(1, v * 1.3) }}>
      <svg width={1080} height={1920}>
        {Array.from({ length: Math.round(26 * v) }, (_, i) => {
          const sp = 5 + random(`hs${i}`) * 6;
          const x = 80 + random(`hx${i}`) * 920 + Math.sin(frame / 12 + i) * 40;
          const y = 1900 - ((random(`hy${i}`) * 1900 + frame * sp) % 1900);
          const s = 0.7 + random(`hz${i}`) * 1.1;
          return (
            <path
              key={i}
              transform={`translate(${x} ${y}) scale(${s}) rotate(${Math.sin(frame / 9 + i) * 15})`}
              d="M0 12 C -22 -6, -10 -26, 0 -12 C 10 -26, 22 -6, 0 12 Z"
              fill={colors[i % colors.length]}
              stroke="#ffffff"
              strokeWidth={2.5}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

/** Selo fixo da série no topo (ex.: "APOCALIPSE ZUMBI · PARTE 1"). */
export const SeriesTag: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  if (!text) return null;
  const end = track("endcard", frame);
  const a = clamp(frame / 12, 0, 1) * (1 - clamp(end * 2, 0, 1));
  if (a < 0.01) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", alignItems: "center" }}>
      <div
        style={{
          marginTop: 150,
          padding: "10px 28px",
          borderRadius: 40,
          background: "rgba(20, 8, 30, 0.82)",
          border: "4px solid #7CFC00",
          color: "#b6ff6a",
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 36,
          letterSpacing: 3,
          opacity: a,
          boxShadow: "0 0 30px rgba(124, 252, 0, 0.35)",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/** Escolha final A/B (dados em scene.choice, frames locais) + "COMENTA A OU B". */
export const ChoiceCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sc = sceneAt(frame);
  const c = sc.choice;
  if (!c) return null;
  const local = frame - sc.startFrame;
  if (local < c.at || (c.until !== undefined && local >= c.until)) return null;
  const card = (letter: string, text: string, color: string, delay: number, side: number) => {
    const s = spring({ frame: local - c.at - delay, fps, config: { damping: 11, stiffness: 160, mass: 0.7 } });
    const pulse = 1 + 0.04 * Math.sin((local + delay * 3) / 5);
    return (
      <div
        style={{
          width: 440,
          minHeight: 420,
          borderRadius: 36,
          background: color,
          border: "10px solid #ffffff",
          boxShadow: "0 24px 50px rgba(0,0,0,0.45)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: "26px 22px",
          scale: String(Math.max(0, s) * pulse),
          translate: `${(1 - Math.min(1, s)) * side * 300}px 0`,
          opacity: clamp(s * 2, 0, 1),
          fontFamily: FONT,
        }}
      >
        <div style={{ fontSize: 170, fontWeight: 900, color: "#ffffff", lineHeight: 1, WebkitTextStroke: `10px ${PALETTE.outline}`, paintOrder: "stroke fill" }}>{letter}</div>
        <div style={{ fontSize: 46, fontWeight: 900, color: "#ffffff", textAlign: "center", lineHeight: 1.1, WebkitTextStroke: `6px ${PALETTE.outline}`, paintOrder: "stroke fill" }}>{text}</div>
      </div>
    );
  };
  const t = spring({ frame: local - c.at - 14, fps, config: { damping: 10, stiffness: 180, mass: 0.6 } });
  return (
    <AbsoluteFill style={{ pointerEvents: "none", alignItems: "center" }}>
      <div style={{ marginTop: 400, display: "flex", gap: 40 }}>
        {card("A", c.a, "linear-gradient(180deg, #ff9f1c 0%, #e85d04 100%)", 0, -1)}
        {card("B", c.b, "linear-gradient(180deg, #4dabf7 0%, #1c7ed6 100%)", 5, 1)}
      </div>
      <div style={{ marginTop: 40, fontFamily: FONT, fontWeight: 900, fontSize: 96, color: "#b6ff6a", WebkitTextStroke: `14px ${PALETTE.outline}`, paintOrder: "stroke fill", scale: String(Math.max(0, t)), rotate: "-3deg" }}>
        COMENTA A OU B!
      </div>
    </AbsoluteFill>
  );
};
