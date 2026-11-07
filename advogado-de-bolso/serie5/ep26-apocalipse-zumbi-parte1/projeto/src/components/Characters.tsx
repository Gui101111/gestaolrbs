import { PALETTE } from "../theme";
import { clamp, type Vec3 } from "../utils/animation";
import { Box, Cone, Cyl, Sph, Torus } from "./prims";

// Personagens low-poly. Origem nos pés, de frente para +z. Ângulos em radianos.

export type MarcosPose = {
  walk?: number;
  walkPhase?: number;
  carry?: number;
  sit?: number;
  scratch?: number;
  thumb?: number;
  squint?: number;
  cast?: number;
  reach?: number;
  handClose?: number;
  stiffGlow?: number;
  stiffTone?: number;
  climb?: number;
  flail?: number;
  work?: number;
  wave?: number;
  frame: number;
  helmet?: boolean;
  sad?: number;
  shirt?: string;
  pain?: number;
  baby?: boolean;
  hair?: string;
  mustache?: boolean;
  hat?: "straw";
};

const mix = (base: number, parts: [number, number][]) => parts.reduce((acc, [w, v]) => acc + clamp(w, 0, 1) * (v - base), base);

/** Mão direita detalhada: palma + 4 dedos de 2 falanges + polegar. Indicador e médio podem ficar rígidos. */
const DetailedHand: React.FC<{ close: number; stiff: boolean; glow: number; tone: number; frame: number }> = ({ close, stiff, glow, tone, frame }) => {
  const free = close * 1.35;
  const rigid = Math.min(close * 1.35, stiff ? 0.32 : 9);
  const glowColor = tone > 0.5 ? "#3d8bff" : PALETTE.red;
  const gi = glow * (0.55 + 0.45 * Math.sin(frame / 4) ** 2);
  const fingers = [
    { x: 0.033, len: 0.04, stiffF: true },
    { x: 0.011, len: 0.044, stiffF: true },
    { x: -0.011, len: 0.041, stiffF: false },
    { x: -0.032, len: 0.034, stiffF: false },
  ];
  return (
    <group>
      <Box p={[0, -0.05, 0]} s={[0.092, 0.1, 0.036]} c={PALETTE.skin} />
      {fingers.map((f, i) => {
        const a = f.stiffF ? rigid : free;
        const lit = f.stiffF && glow > 0.01;
        return (
          <group key={i} position={[f.x, -0.1, 0]} rotation={[-a, 0, 0]}>
            <Box p={[0, -f.len / 2, 0]} s={[0.02, f.len, 0.022]} c={PALETTE.skin} emissive={lit ? glowColor : undefined} ei={lit ? gi : 0} />
            <group position={[0, -f.len, 0]} rotation={[-a * 1.1, 0, 0]}>
              <Box p={[0, -f.len * 0.42, 0]} s={[0.019, f.len * 0.85, 0.02]} c={PALETTE.skin} emissive={lit ? glowColor : undefined} ei={lit ? gi : 0} />
            </group>
          </group>
        );
      })}
      <group position={[0.05, -0.03, 0]} rotation={[-close * 0.8, close * 0.6, 0.55]}>
        <Box p={[0, -0.025, 0]} s={[0.022, 0.05, 0.024]} c={PALETTE.skin} />
      </group>
    </group>
  );
};

export const Marcos: React.FC<{ pose: MarcosPose }> = ({ pose }) => {
  const { frame } = pose;
  const walk = pose.walk ?? 0;
  const ph = pose.walkPhase ?? frame * 0.45;
  const sit = clamp(pose.sit ?? 0, 0, 1);
  const carry = pose.carry ?? 0;
  const reach = pose.reach ?? 0;
  const cast = clamp(pose.cast ?? 0, 0, 1.2);
  const climb = pose.climb ?? 0;
  const flail = pose.flail ?? 0;
  const work = pose.work ?? 0;
  const wk = Math.sin(frame / 7);
  const cl = Math.sin(frame / 5);
  const swing = Math.sin(ph) * 0.55 * walk;

  const rShX = mix(0.05 - swing * 0.6, [
    [carry, -0.95],
    [reach, -1.38],
    [cast, -0.3],
    [work, -0.95 + 0.4 * wk],
    [climb, -2.6 + 0.35 * cl],
    [flail, -2.7 + 0.4 * Math.sin(frame / 2)],
    [pose.wave ?? 0, -2.9],
  ]);
  const rElb = mix(-0.08, [
    [carry, -0.75],
    [reach, -0.12],
    [cast, -1.55],
    [work, -0.7],
    [climb, -0.3],
  ]);
  const rShZ = mix(-0.08, [
    [cast, 0.25],
    [pose.wave ?? 0, -0.35 + 0.4 * Math.sin(frame / 3)],
  ]);
  const lShX = mix(0.05 + swing * 0.6, [
    [carry, -0.95],
    [pose.scratch ?? 0, -2.75],
    [pose.thumb ?? 0, -1.15],
    [work, -0.95 - 0.4 * wk],
    [climb, -2.6 - 0.35 * cl],
    [flail, -2.7 - 0.4 * Math.sin(frame / 2)],
  ]);
  const lElb = mix(-0.08, [
    [carry, -0.75],
    [pose.scratch ?? 0, -1.95],
    [pose.thumb ?? 0, -0.95],
    [work, -0.7],
  ]);
  const lShZ = mix(0.08, [[pose.scratch ?? 0, 0.35]]);

  const thighBase = (side: number) => side * Math.sin(ph) * 0.55 * walk + side * climb * 0.5 * cl;
  const yDrop = -sit * 0.36;
  const squint = clamp(pose.squint ?? 0, 0, 1);
  const sad = clamp(pose.sad ?? 0, 0, 1);
  const shirt = pose.shirt ?? PALETTE.shirt;

  return (
    <group position={[0, yDrop, 0]}>
      {/* pernas */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.115, 0.82, 0]} rotation={[mix(thighBase(side), [[sit, -1.5]]), 0, 0]}>
          <Box p={[0, -0.21, 0]} s={[0.17, 0.42, 0.19]} c={PALETTE.pants} />
          <group position={[0, -0.42, 0]} rotation={[mix(Math.max(0, -thighBase(side)) * 0.6, [[sit, 1.5]]), 0, 0]}>
            <Box p={[0, -0.19, 0]} s={[0.16, 0.38, 0.18]} c={PALETTE.pants} />
            <Box p={[0, -0.38, 0.04]} s={[0.18, 0.1, 0.28]} c={PALETTE.boots} />
          </group>
        </group>
      ))}
      {/* tronco */}
      <Box p={[0, 0.85, 0]} s={[0.53, 0.07, 0.31]} c="#4a3324" />
      <Box p={[0, 1.13, 0]} s={[0.52, 0.56, 0.3]} c={shirt} emissive={(pose.pain ?? 0) > 0.01 ? "#ff2a2a" : undefined} ei={(pose.pain ?? 0) * (0.35 + 0.35 * Math.abs(Math.sin(frame / 4)))} />
      <Box p={[0, 1.13, 0.152]} s={[0.025, 0.5, 0.01]} c="#5c8fc4" cast={false} />
      <Box p={[0, 1.4, 0.06]} s={[0.3, 0.06, 0.2]} c="#6aa0d8" />
      {/* bolso (a casa da Lia) */}
      <Box p={[0.12, 1.29, 0.185]} s={[0.15, 0.14, 0.07]} c="#5f93cb" />
      <Box p={[0.12, 1.37, 0.222]} s={[0.155, 0.035, 0.012]} c="#4f80b5" cast={false} />
      {/* cabeça */}
      <Cyl p={[0, 1.47, 0]} rt={0.07} h={0.1} seg={8} c={PALETTE.skin} />
      <group position={[0, 1.67, 0]}>
        <Sph rad={0.2} detail={1} c={PALETTE.skin} />
        {pose.mustache ? <Box p={[0, -0.065, 0.19]} s={[0.13, 0.03, 0.02]} c={PALETTE.hair} cast={false} /> : null}
        {pose.hat === "straw" ? (
          <>
            <Cyl p={[0, 0.15, -0.01]} rt={0.36} h={0.03} seg={12} c="#e8c66a" />
            <Cyl p={[0, 0.24, -0.01]} rt={0.17} rb={0.2} h={0.16} seg={12} c="#e8c66a" />
            <Cyl p={[0, 0.19, -0.01]} rt={0.205} h={0.03} seg={12} c="#b5651d" />
          </>
        ) : null}
        {pose.helmet ? (
          <>
            <Sph p={[0, 0.03, -0.01]} rad={0.24} detail={1} s={[1, 0.95, 1.05]} c="#d63c3c" />
            <Box p={[0, 0.0, 0.2]} s={[0.3, 0.12, 0.05]} c="#2a2f38" opacity={0.75} />
          </>
        ) : (
          <>
            <Sph p={[0, 0.08, -0.02]} rad={0.205} detail={1} s={[1.02, 0.62, 1.02]} c={pose.hair ?? PALETTE.hair} />
            <Box p={[-0.075, 0.075, 0.18]} r={[0, 0, -0.15 + sad * 0.35]} s={[0.07, 0.018, 0.015]} c={PALETTE.hair} cast={false} />
            <Box p={[0.075, 0.075, 0.18]} r={[0, 0, 0.15 - sad * 0.35]} s={[0.07, 0.018, 0.015]} c={PALETTE.hair} cast={false} />
          </>
        )}
        <Sph p={[-0.075, 0.02, 0.178]} rad={0.028} detail={0} s={[1, 1 - squint * 0.75, 1]} c="#1a1a1a" cast={false} />
        <Sph p={[0.075, 0.02, 0.178]} rad={0.028} detail={0} s={[1, 1 - squint * 0.75, 1]} c="#1a1a1a" cast={false} />
        <Sph p={[0, -0.03, 0.2]} rad={0.035} detail={0} c="#b87a52" cast={false} />
        <Box p={[0, -0.095, 0.185]} r={[0, 0, 0]} s={[0.09 - sad * 0.03, 0.018, 0.012]} c="#6b2e22" cast={false} />
      </group>
      {/* braço direito (lado -x) com mão detalhada */}
      <group position={[-0.33, 1.37, 0]} rotation={[rShX, 0, rShZ]}>
        <Cyl p={[0, -0.15, 0]} rt={0.068} h={0.3} seg={7} c={shirt} />
        <group position={[0, -0.3, 0]} rotation={[rElb, 0, 0]}>
          <Cyl p={[0, -0.14, 0]} rt={0.057} h={0.28} seg={7} c={PALETTE.skin} />
          <group position={[0, -0.29, 0]}>
            {cast > 0.02 ? (
              <group scale={clamp(cast, 0, 1.2)}>
                <Box p={[0, 0.09, 0]} s={[0.15, 0.36, 0.15]} c="#fbfbf8" />
                <Box p={[0, -0.06, 0]} s={[0.13, 0.14, 0.12]} c="#f1f1ec" />
              </group>
            ) : (
              <DetailedHand close={pose.handClose ?? 0} stiff glow={pose.stiffGlow ?? 0} tone={pose.stiffTone ?? 0} frame={frame} />
            )}
          </group>
        </group>
      </group>
      {cast > 0.5 ? <Box p={[0.02, 1.12, 0.17]} r={[0, 0, 0.62]} s={[0.62, 0.15, 0.02]} c="#dfe7ee" cast={false} /> : null}
      {/* braço esquerdo */}
      <group position={[0.33, 1.37, 0]} rotation={[lShX, 0, lShZ]}>
        <Cyl p={[0, -0.15, 0]} rt={0.068} h={0.3} seg={7} c={shirt} />
        <group position={[0, -0.3, 0]} rotation={[lElb, 0, 0]}>
          <Cyl p={[0, -0.14, 0]} rt={0.057} h={0.28} seg={7} c={PALETTE.skin} />
          <Box p={[0, -0.33, 0]} s={[0.085, 0.1, 0.045]} c={PALETTE.skin} />
          {(pose.thumb ?? 0) > 0.3 ? <Box p={[0, -0.26, 0.05]} r={[0.3, 0, 0]} s={[0.03, 0.08, 0.03]} c={PALETTE.skin} /> : null}
        </group>
      </group>
      {pose.baby ? (
        <group position={[0, 1.04, 0.4]}>
          <Baby frame={frame} />
        </group>
      ) : null}
      {carry > 0.05 && !pose.baby ? <Box p={[0, 1.02, 0.42]} s={[0.46, 0.36, 0.36].map((v) => v * clamp(carry, 0, 1)) as Vec3} c={PALETTE.cardboard} /> : null}
    </group>
  );
};

/** Lia, a "Advogada de Bolso": 0,26 de altura. point = braço apontando; wave = aceno. */
export const Lia: React.FC<{ point?: number; wave?: number; frame: number; gavel?: number; witch?: boolean }> = ({ point = 0, wave = 0, frame, gavel, witch = false }) => {
  const navy = PALETTE.navy;
  const skin = "#8d5a3b";
  const rArm = -2.1 * clamp(point, 0, 1);
  const lArmZ = 2.5 * clamp(wave, 0, 1) + 0.35 * clamp(wave, 0, 1) * Math.sin(frame / 3.5);
  return (
    <group>
      <Box p={[-0.019, 0.045, 0]} s={[0.026, 0.09, 0.03]} c={navy} />
      <Box p={[0.019, 0.045, 0]} s={[0.026, 0.09, 0.03]} c={navy} />
      <Box p={[-0.019, 0.006, 0.008]} s={[0.03, 0.014, 0.042]} c="#ffffff" />
      <Box p={[0.019, 0.006, 0.008]} s={[0.03, 0.014, 0.042]} c="#ffffff" />
      <Box p={[0, 0.137, 0]} s={[0.088, 0.094, 0.052]} c={navy} />
      <Box p={[0, 0.148, 0.027]} s={[0.028, 0.06, 0.004]} c="#ffffff" cast={false} />
      <Sph p={[0.026, 0.16, 0.028]} rad={0.007} detail={0} c={PALETTE.gold} emissive={PALETTE.gold} ei={0.4} cast={false} />
      <Sph p={[0, 0.218, 0]} rad={0.043} detail={1} c={skin} />
      <Sph p={[0, 0.235, -0.008]} rad={0.046} detail={1} s={[1, 0.72, 1]} c="#1e1410" />
      <Sph p={[0, 0.272, -0.014]} rad={0.022} detail={1} c="#1e1410" />
      {witch ? (
        <group position={[0, 0.262, -0.005]} rotation={[0.15, 0, -0.12]}>
          <Cyl rt={0.075} h={0.008} seg={12} c="#1b1426" />
          <Cone p={[0, 0.07, 0]} rad={0.045} h={0.14} seg={8} c="#1b1426" />
          <Cyl p={[0, 0.012, 0]} rt={0.047} h={0.012} seg={10} c="#7b2cbf" />
        </group>
      ) : null}
      <Torus p={[-0.016, 0.22, 0.04]} rad={0.012} tube={0.0028} seg={10} c={PALETTE.gold} cast={false} />
      <Torus p={[0.016, 0.22, 0.04]} rad={0.012} tube={0.0028} seg={10} c={PALETTE.gold} cast={false} />
      <Sph p={[-0.016, 0.22, 0.039]} rad={0.005} detail={0} c="#111111" cast={false} />
      <Sph p={[0.016, 0.22, 0.039]} rad={0.005} detail={0} c="#111111" cast={false} />
      <Box p={[0, 0.196, 0.04]} s={[0.018, 0.004, 0.003]} c="#7a2a24" cast={false} />
      <group position={[-0.052, 0.175, 0]} rotation={[rArm + (gavel !== undefined ? -1.6 - gavel : 0), 0, -0.15]}>
        <Box p={[0, -0.037, 0]} s={[0.022, 0.075, 0.022]} c={navy} />
        <Sph p={[0, -0.08, 0]} rad={0.012} detail={0} c={skin} />
        {gavel !== undefined ? (
          <group position={[0, -0.09, 0]}>
            <Cyl p={[0, -0.09, 0]} rt={0.009} h={0.2} seg={6} c={PALETTE.woodDark} />
            <Cyl p={[0, -0.2, 0]} r={[0, 0, Math.PI / 2]} rt={0.035} h={0.12} seg={8} c={PALETTE.wood} />
          </group>
        ) : null}
      </group>
      <group position={[0.052, 0.175, 0]} rotation={[0, 0, 0.15 + lArmZ]}>
        <Box p={[0, -0.037, 0]} s={[0.022, 0.075, 0.022]} c={navy} />
        <Sph p={[0, -0.08, 0]} rad={0.012} detail={0} c={skin} />
      </group>
    </group>
  );
};

export type PawnKind = "carteira" | "domestica" | "portuario" | "rural" | "mei" | "zumbi";

const PAWN: Record<PawnKind, { shirt: string; skin: string }> = {
  carteira: { shirt: "#7fb2e5", skin: "#c98e63" },
  domestica: { shirt: "#e88aa8", skin: "#7a4a2e" },
  portuario: { shirt: "#f08c2e", skin: "#b5794f" },
  rural: { shirt: "#8fbf5a", skin: "#a8714a" },
  mei: { shirt: "#9b7fd6", skin: "#e0b08a" },
  zumbi: { shirt: "#5d6d5e", skin: "#9ccc65" },
};

/** Bonequinho da fila do portão (1,5 de altura), com acessório que identifica a categoria. */
export const Pawn: React.FC<{ kind: PawnKind; frame: number; walk?: number; shrug?: number }> = ({ kind, frame, walk = 0, shrug = 0 }) => {
  const k = PAWN[kind];
  const sw = Math.sin(frame * 0.45) * 0.5 * walk;
  const sh = clamp(shrug, 0, 1);
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.09, 0.62, 0]} rotation={[side * sw, 0, 0]}>
          <Box p={[0, -0.31, 0]} s={[0.13, 0.62, 0.15]} c="#4d5560" />
        </group>
      ))}
      <Box p={[0, 0.9, 0]} s={[0.42, 0.56, 0.26]} c={k.shirt} />
      <Sph p={[0, 1.36, 0]} rad={0.17} detail={1} c={k.skin} />
      <Sph p={[-0.06, 1.38, 0.15]} rad={0.022} detail={0} c="#1a1a1a" cast={false} />
      <Sph p={[0.06, 1.38, 0.15]} rad={0.022} detail={0} c="#1a1a1a" cast={false} />
      {/* braços (ombros sobem no "dar de ombros") */}
      {[-1, 1].map((side) => (
        <group key={`a${side}`} position={[side * 0.26, 1.12 + sh * 0.06, 0]} rotation={[-side * sw * 0.8 - (kind === "zumbi" ? 1.45 + Math.sin(frame / 7 + side) * 0.08 : kind === "mei" || kind === "rural" || kind === "carteira" ? 0.7 : 0), 0, side * (0.08 + sh * 0.9)]}>
          <Cyl p={[0, -0.22, 0]} rt={0.055} h={0.44} seg={6} c={k.shirt} />
        </group>
      ))}
      {kind === "zumbi" ? (
        <>
          <Box p={[0, 1.28, 0.15]} s={[0.12, 0.04, 0.03]} c="#3b1f1f" cast={false} />
          <Box p={[0.1, 0.78, 0.135]} r={[0, 0, 0.4]} s={[0.12, 0.16, 0.01]} c="#3f4a40" cast={false} />
          <Box p={[-0.12, 1.02, 0.135]} r={[0, 0, -0.3]} s={[0.1, 0.1, 0.01]} c="#3f4a40" cast={false} />
        </>
      ) : null}
      {kind === "carteira" ? <Box p={[0.3, 0.86, 0.3]} r={[0.3, 0, 0]} s={[0.2, 0.27, 0.04]} c="#1e4fb3" /> : null}
      {kind === "domestica" ? (
        <>
          <Box p={[0, 0.82, 0.135]} s={[0.36, 0.5, 0.02]} c="#ffffff" />
          <Sph p={[0, 1.5, -0.04]} rad={0.12} detail={1} s={[1.2, 0.7, 1]} c="#2b1d16" />
        </>
      ) : null}
      {kind === "portuario" ? (
        <>
          <Sph p={[0, 1.47, 0]} rad={0.19} detail={1} s={[1, 0.6, 1]} c="#ffd43b" />
          <Sph p={[-0.2, 1.22, -0.02]} rad={0.2} detail={1} s={[1.2, 0.8, 0.9]} c="#c9b07a" />
        </>
      ) : null}
      {kind === "rural" ? (
        <>
          <Cyl p={[0, 1.5, 0]} rt={0.3} h={0.03} seg={10} c="#e8c66a" />
          <Cyl p={[0, 1.57, 0]} rt={0.14} rb={0.16} h={0.12} seg={10} c="#e8c66a" />
          <Cyl p={[0.3, 0.75, 0.25]} rt={0.14} rb={0.11} h={0.18} seg={8} c="#a8743f" />
          <Sph p={[0.3, 0.87, 0.25]} rad={0.1} detail={0} c="#4caf50" />
        </>
      ) : null}
      {kind === "mei" ? (
        <group position={[0, 0.95, 0.32]} rotation={[-0.2, 0, 0]}>
          <Box s={[0.42, 0.02, 0.28]} c="#5b6470" />
          <Box p={[0, 0.13, -0.14]} r={[-0.25, 0, 0]} s={[0.42, 0.26, 0.02]} c="#3a4350" />
        </group>
      ) : null}
    </group>
  );
};

/** Dona Maria: idosa (1,55 de altura), coque grisalho, óculos, vestido lilás e bengala. */
export const Elder: React.FC<{ frame: number; wave?: number; walk?: number; sad?: number; hop?: number; dress?: string; top?: string }> = ({ frame, wave = 0, walk = 0, sad = 0, dress: dressIn, top: topIn }) => {
  const sw = Math.sin(frame * 0.4) * 0.35 * walk;
  const skin = "#d9a77f";
  const dress = dressIn ?? "#9b6fc7";
  const cardigan = topIn ?? "#c9b1e3";
  const w = clamp(wave, 0, 1);
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.08, 0.5, 0]} rotation={[s * sw, 0, 0]}>
          <Box p={[0, -0.25, 0]} s={[0.1, 0.5, 0.12]} c="#e8d2c0" />
          <Box p={[0, -0.48, 0.03]} s={[0.12, 0.06, 0.2]} c="#5b3b25" />
        </group>
      ))}
      <Cyl p={[0, 0.72, 0]} rt={0.2} rb={0.3} h={0.55} seg={10} c={dress} />
      <Box p={[0, 1.08, 0]} s={[0.4, 0.36, 0.26]} c={cardigan} />
      <Box p={[0, 1.08, 0.135]} s={[0.08, 0.32, 0.01]} c="#ffffff" cast={false} />
      <Cyl p={[0, 1.3, 0]} rt={0.06} h={0.08} seg={8} c={skin} />
      <group position={[0, 1.45, 0]}>
        <Sph rad={0.17} detail={1} c={skin} />
        <Sph p={[0, 0.07, -0.02]} rad={0.175} detail={1} s={[1.02, 0.62, 1.02]} c="#d8d8de" />
        <Sph p={[0, 0.16, -0.1]} rad={0.08} detail={1} c="#cfcfd6" />
        <Torus p={[-0.06, 0.01, 0.16]} rad={0.035} tube={0.008} seg={10} c="#8a6a2a" cast={false} />
        <Torus p={[0.06, 0.01, 0.16]} rad={0.035} tube={0.008} seg={10} c="#8a6a2a" cast={false} />
        <Sph p={[-0.06, 0.01, 0.155]} rad={0.018} detail={0} c="#1a1a1a" cast={false} />
        <Sph p={[0.06, 0.01, 0.155]} rad={0.018} detail={0} c="#1a1a1a" cast={false} />
        <Box p={[0, -0.08, 0.16]} s={[0.07 - sad * 0.02, 0.014, 0.01]} c="#9a3b3b" cast={false} />
        <Sph p={[-0.1, -0.04, 0.13]} rad={0.03} detail={0} c="#f2a3a3" opacity={0.7} cast={false} />
        <Sph p={[0.1, -0.04, 0.13]} rad={0.03} detail={0} c="#f2a3a3" opacity={0.7} cast={false} />
      </group>
      {/* braço direito com bengala */}
      <group position={[-0.24, 1.2, 0]} rotation={[-0.35, 0, -0.15]}>
        <Cyl p={[0, -0.17, 0]} rt={0.05} h={0.34} seg={6} c={cardigan} />
        <Sph p={[0, -0.37, 0]} rad={0.05} detail={0} c={skin} />
        <Cyl p={[0, -0.75, 0.12]} r={[0.3, 0, 0]} rt={0.02} h={0.78} seg={6} c={PALETTE.woodDark} />
      </group>
      {/* braço esquerdo (aceno) */}
      <group position={[0.24, 1.2, 0]} rotation={[0, 0, 0.12 + w * (2.5 + 0.35 * Math.sin(frame / 3.5))]}>
        <Cyl p={[0, -0.17, 0]} rt={0.05} h={0.34} seg={6} c={cardigan} />
        <Sph p={[0, -0.37, 0]} rad={0.05} detail={0} c={skin} />
      </group>
    </group>
  );
};

/** Pessoa em cadeira de rodas (rodas giram com `roll`). */
export const WheelchairPerson: React.FC<{ frame: number; roll?: number; wave?: number }> = ({ frame, roll = 0, wave = 0 }) => {
  const w = clamp(wave, 0, 1);
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.28, 0.32, 0]} rotation={[roll * 6, 0, 0]}>
          <Torus r={[0, Math.PI / 2, 0]} rad={0.3} tube={0.03} seg={14} c="#2a2f38" />
          <Cyl r={[0, 0, Math.PI / 2]} rt={0.03} h={0.06} seg={6} c="#9aa3ad" />
        </group>
      ))}
      {[-1, 1].map((s) => (
        <Sph key={`f${s}`} p={[s * 0.2, 0.08, 0.32]} rad={0.07} detail={0} c="#2a2f38" />
      ))}
      <Box p={[0, 0.48, 0.02]} s={[0.5, 0.06, 0.45]} c="#3b82f6" />
      <Box p={[0, 0.78, -0.22]} s={[0.5, 0.55, 0.05]} c="#3b82f6" />
      {/* pessoa sentada */}
      {[-1, 1].map((s) => (
        <group key={`l${s}`}>
          <Box p={[s * 0.1, 0.56, 0.18]} s={[0.13, 0.12, 0.4]} c="#4d5560" />
          <Box p={[s * 0.1, 0.33, 0.38]} s={[0.12, 0.42, 0.13]} c="#4d5560" />
        </group>
      ))}
      <Box p={[0, 0.86, -0.05]} s={[0.4, 0.5, 0.24]} c="#f0a35e" />
      <Sph p={[0, 1.27, -0.04]} rad={0.16} detail={1} c="#a8714a" />
      <Sph p={[0, 1.34, -0.07]} rad={0.165} detail={1} s={[1, 0.62, 1]} c="#2b1d16" />
      <Sph p={[-0.055, 1.28, 0.1]} rad={0.02} detail={0} c="#1a1a1a" cast={false} />
      <Sph p={[0.055, 1.28, 0.1]} rad={0.02} detail={0} c="#1a1a1a" cast={false} />
      <group position={[0.24, 1.04, -0.05]} rotation={[-0.6, 0, 0.1 + w * (2.4 + 0.35 * Math.sin(frame / 3.5))]}>
        <Cyl p={[0, -0.16, 0]} rt={0.05} h={0.32} seg={6} c="#f0a35e" />
      </group>
      <group position={[-0.24, 1.04, -0.05]} rotation={[-0.9, 0, -0.1]}>
        <Cyl p={[0, -0.16, 0]} rt={0.05} h={0.32} seg={6} c="#f0a35e" />
      </group>
    </group>
  );
};

/** Bebê enrolado na mantinha (0,32 de comprimento). */
export const Baby: React.FC<{ frame: number }> = ({ frame }) => (
  <group rotation={[0, 0, Math.sin(frame / 10) * 0.08]}>
    <Sph p={[0, 0, 0]} rad={0.13} detail={1} s={[1.25, 0.8, 0.8]} c="#ffd1e3" />
    <Sph p={[0.17, 0.03, 0]} rad={0.085} detail={1} c="#f2c4a0" />
    <Sph p={[0.2, 0.05, 0.07]} rad={0.012} detail={0} c="#1a1a1a" cast={false} />
    <Sph p={[0.2, 0.05, -0.07]} rad={0.012} detail={0} c="#1a1a1a" cast={false} />
    <Sph p={[0.12, 0.09, 0]} rad={0.07} detail={1} s={[1, 0.6, 1.1]} c="#ffb3cf" />
  </group>
);

/** Ana: mulher jovem (1,65), rabo de cavalo; belly 0–1 = gravidez; holdBaby/holdBox nos braços. */
export const Woman: React.FC<{ frame: number; belly?: number; wave?: number; walk?: number; holdBaby?: boolean; holdBox?: boolean; top?: string; sad?: number; curlers?: boolean }> = ({
  frame,
  belly = 0,
  wave = 0,
  walk = 0,
  holdBaby = false,
  holdBox = false,
  top = "#ff7aa8",
  sad = 0,
  curlers = false,
}) => {
  const sw = Math.sin(frame * 0.42) * 0.45 * walk;
  const skin = "#b9825a";
  const w = clamp(wave, 0, 1);
  const hold = holdBaby || holdBox;
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.09, 0.78, 0]} rotation={[s * sw, 0, 0]}>
          <Box p={[0, -0.38, 0]} s={[0.13, 0.76, 0.15]} c="#3e5a8a" />
          <Box p={[0, -0.75, 0.04]} s={[0.14, 0.07, 0.22]} c="#ffffff" />
        </group>
      ))}
      <Box p={[0, 1.08, 0]} s={[0.42, 0.6, 0.25]} c={top} />
      {belly > 0.01 ? <Sph p={[0, 0.98, 0.13 + 0.08 * belly]} rad={0.2 * clamp(belly, 0, 1.2)} detail={1} s={[1, 1, 1.05]} c={top} /> : null}
      <Cyl p={[0, 1.42, 0]} rt={0.06} h={0.08} seg={8} c={skin} />
      <group position={[0, 1.58, 0]}>
        <Sph rad={0.17} detail={1} c={skin} />
        <Sph p={[0, 0.06, -0.03]} rad={0.178} detail={1} s={[1.02, 0.8, 1.02]} c="#3a2418" />
        {curlers ? (
          [-0.12, 0, 0.12].map((x) => <Cyl key={x} p={[x, 0.2, 0.0]} r={[0, 0, Math.PI / 2]} rt={0.045} h={0.1} seg={8} c="#ff6fb5" />)
        ) : (
          <Sph p={[0, 0.02, -0.22]} rad={0.07} detail={1} s={[1, 1.6, 1]} c="#3a2418" />
        )}
        <Sph p={[-0.06, 0.0, 0.155]} rad={0.022} detail={0} c="#1a1a1a" cast={false} />
        <Sph p={[0.06, 0.0, 0.155]} rad={0.022} detail={0} c="#1a1a1a" cast={false} />
        <Box p={[0, -0.08, 0.16]} s={[0.07 - sad * 0.02, 0.014, 0.01]} c="#b23a48" cast={false} />
        <Sph p={[-0.1, -0.04, 0.13]} rad={0.03} detail={0} c="#f29a9a" opacity={0.6} cast={false} />
        <Sph p={[0.1, -0.04, 0.13]} rad={0.03} detail={0} c="#f29a9a" opacity={0.6} cast={false} />
      </group>
      {/* braços: segurando (bebê/caixa) ou balançando; o esquerdo acena */}
      <group position={[-0.25, 1.32, 0]} rotation={[hold ? -1.0 : -sw * 0.6, 0, hold ? 0.35 : -0.1]}>
        <Cyl p={[0, -0.18, 0]} rt={0.05} h={0.36} seg={6} c={top} />
        <Sph p={[0, -0.38, 0]} rad={0.05} detail={0} c={skin} />
      </group>
      <group position={[0.25, 1.32, 0]} rotation={[hold ? -1.0 : sw * 0.6, 0, hold ? -0.35 : 0.1 + w * (2.5 + 0.35 * Math.sin(frame / 3.5))]}>
        <Cyl p={[0, -0.18, 0]} rt={0.05} h={0.36} seg={6} c={top} />
        <Sph p={[0, -0.38, 0]} rad={0.05} detail={0} c={skin} />
      </group>
      {holdBaby ? (
        <group position={[0, 1.08, 0.36]}>
          <Baby frame={frame} />
        </group>
      ) : null}
      {holdBox ? <Box p={[0, 1.0, 0.36]} s={[0.4, 0.3, 0.3]} c={PALETTE.cardboard} /> : null}
    </group>
  );
};
