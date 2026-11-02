import { interpolateColors } from "remotion";
import { L } from "../layout";
import { PALETTE } from "../theme";
import { clamp, randRange, type Vec3 } from "../utils/animation";
import { Box, Cone, Cyl, G, Sph, Torus, v3 } from "./prims";

// Objetos de cena. Cada um recebe valores de trilha já avaliados no frame global.

export const Siren: React.FC<{ drop: number; flash: number; squashed: boolean; frame: number }> = ({ drop, flash, squashed, frame }) => {
  const y = squashed ? 0 : (1 - clamp(drop, 0, 1.2)) * 4.5;
  const sy = squashed ? 0.22 + 0.78 * clamp(drop, 0, 1) : 1;
  if (!squashed && drop <= 0.001) return null;
  const on = flash > 0.01 && Math.floor(frame / 4) % 2 === 0;
  return (
    <group position={[-0.15, y, 3.05]} scale={[1, sy, 1]}>
      <Cyl p={[0, 0.07, 0]} rt={0.22} h={0.14} seg={10} c="#22262d" />
      <Sph p={[0, 0.2, 0]} rad={0.19} detail={1} s={[1, 0.9, 1]} c="#ff3b3b" emissive="#ff2020" ei={on ? 1.4 : 0.25} opacity={0.92} />
    </group>
  );
};

export const LawBook: React.FC<{ drop: number }> = ({ drop }) => {
  if (drop <= 0.001) return null;
  const y = 0.05 + (1 - clamp(drop, 0, 1.2)) * 5;
  return (
    <group position={[-0.15, y, 3.05]} rotation={[0, 0.25, 0]}>
      <Box p={[0, 0.13, 0]} s={[0.8, 0.26, 0.6]} c={PALETTE.navy} />
      <Box p={[0.02, 0.13, 0]} s={[0.76, 0.2, 0.58]} c="#f4ecd8" />
      <Box p={[0, 0.265, 0]} s={[0.8, 0.012, 0.6]} c={PALETTE.navy} />
      <Box p={[0, 0.275, 0]} s={[0.8, 0.01, 0.12]} c={PALETTE.gold} emissive={PALETTE.gold} ei={0.3} />
      <Box p={[-0.401, 0.13, 0]} s={[0.012, 0.26, 0.6]} c="#0a1a4a" />
    </group>
  );
};

export const WorkBooklet: React.FC<{ pop: number; frame: number }> = ({ pop, frame }) => (
  <G p={[L.work[0], 2.35, L.work[2]]} r={[0, frame * 0.08, 0]} s={clamp(pop, 0, 1.3)}>
    <Box s={[0.34, 0.46, 0.05]} c="#1e4fb3" />
    <Sph p={[0, 0.06, 0.03]} rad={0.07} detail={0} s={[1, 1, 0.3]} c={PALETTE.gold} emissive={PALETTE.gold} ei={0.4} />
    <Box p={[0, -0.12, 0.028]} s={[0.2, 0.025, 0.005]} c={PALETTE.gold} cast={false} />
  </G>
);

export const Hourglass: React.FC<{ pop: number; frame: number }> = ({ pop, frame }) => (
  <G p={[1.45, 4.05, 0.7]} r={[0, frame * 0.03, Math.sin(frame / 15) * 0.15]} s={clamp(pop, 0, 1.3) * 0.9}>
    <Cyl p={[0, 0.3, 0]} rt={0.2} h={0.05} seg={8} c={PALETTE.wood} />
    <Cyl p={[0, -0.3, 0]} rt={0.2} h={0.05} seg={8} c={PALETTE.wood} />
    <Cone p={[0, 0.14, 0]} r={[Math.PI, 0, 0]} rad={0.16} h={0.28} seg={8} c="#bfe7ff" opacity={0.6} />
    <Cone p={[0, -0.14, 0]} rad={0.16} h={0.28} seg={8} c="#bfe7ff" opacity={0.6} />
    <Cone p={[0, -0.2, 0]} rad={0.1} h={0.12} seg={8} c="#f5c26b" />
  </G>
);

export const Bench: React.FC = () => (
  <group position={L.bench}>
    <Box p={[0, 0.42, 0]} s={[1.1, 0.07, 0.4]} c={PALETTE.wood} />
    {[-0.45, 0.45].map((x) => (
      <Box key={x} p={[x, 0.2, 0]} s={[0.08, 0.4, 0.34]} c={PALETTE.woodDark} />
    ))}
  </group>
);

export const ShelfAndLadder: React.FC<{ wobble: number; frame: number; slide?: number }> = ({ wobble, frame, slide = 0 }) => {
  const ang = (18 * Math.PI) / 180 * Math.sin((frame / 30) * Math.PI * 4) * clamp(wobble, 0, 1);
  return (
    <group>
      <group position={L.shelf}>
        {[-0.7, 0.7].map((x) => (
          <Box key={x} p={[x, 1.25, 0]} s={[0.07, 2.5, 0.5]} c="#8a96a3" />
        ))}
        {[0.3, 1.1, 1.9, 2.45].map((y) => (
          <Box key={y} p={[0, y, 0]} s={[1.5, 0.05, 0.5]} c="#a9b4bf" />
        ))}
        <Box p={[-0.35, 0.53, 0]} s={[0.42, 0.42, 0.4]} c={PALETTE.cardboard} />
        <Box p={[0.3, 1.33, 0]} s={[0.46, 0.4, 0.4]} c="#d8ab6c" />
        <Box p={[-0.2, 2.13, 0]} s={[0.4, 0.4, 0.4]} c="#b98a4e" />
      </group>
      <group position={[L.ladderBase[0], 0, L.ladderBase[2] + clamp(slide, 0, 1) * 0.9]} rotation={[0.12 + clamp(slide, 0, 1) * 1.15, 0, ang]}>
        {[-0.22, 0.22].map((x) => (
          <Box key={x} p={[x, 1.1, 0]} s={[0.06, 2.2, 0.06]} c="#e0b13a" />
        ))}
        {[0.3, 0.65, 1.0, 1.35, 1.7, 2.05].map((y) => (
          <Box key={y} p={[0, y, 0]} s={[0.44, 0.04, 0.05]} c="#c99a2e" />
        ))}
      </group>
    </group>
  );
};

/** Caixas macias onde o Marcos cai. */
export const BoxPile: React.FC = () => (
  <group position={L.boxPile}>
    <Box p={[0, 0.2, 0]} r={[0, 0.3, 0]} s={[0.45, 0.4, 0.45]} c={PALETTE.cardboard} />
    <Box p={[0.45, 0.17, 0.25]} r={[0, -0.4, 0.1]} s={[0.4, 0.34, 0.4]} c="#d8ab6c" />
    <Box p={[0.15, 0.52, 0.05]} r={[0.1, 0.8, 0]} s={[0.36, 0.3, 0.36]} c="#b98a4e" />
  </group>
);

export const DizzyStars: React.FC<{ at: Vec3; amount: number; frame: number }> = ({ at, amount, frame }) => {
  if (amount <= 0.01) return null;
  return (
    <group position={at} scale={clamp(amount, 0, 1)}>
      {Array.from({ length: 5 }, (_, i) => {
        const a = frame * 0.18 + (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.3, 0.05 * Math.sin(a * 2), Math.sin(a) * 0.3]} rotation={[a, a, 0]}>
            <octahedronGeometry args={[0.06, 0]} />
            <meshStandardMaterial color="#ffd43b" emissive="#ffc107" emissiveIntensity={0.8} flatShading />
          </mesh>
        );
      })}
    </group>
  );
};

/** Folha + carimbo gigante da perícia (ALTA, verde). */
export const Stamp: React.FC<{ drop: number; marked: boolean; color: string; at: Vec3 }> = ({ drop, marked, color, at }) => {
  const y = 0.08 + (1 - clamp(drop, 0, 1.15)) * 1.8;
  return (
    <group position={at}>
      <Box p={[0, 0, 0]} r={[0.25, 0, 0]} s={[0.55, 0.02, 0.4]} c="#ffffff" />
      {marked ? <Box p={[0, 0.02, 0]} r={[0.25, 0, 0]} s={[0.36, 0.012, 0.18]} c={color} emissive={color} ei={0.35} cast={false} /> : null}
      {drop > 0.001 ? (
        <group position={[0, y, 0]}>
          <Box p={[0, 0.05, 0]} s={[0.42, 0.1, 0.24]} c="#5b3b25" />
          <Box p={[0, -0.01, 0]} s={[0.38, 0.03, 0.2]} c={color} />
          <Cyl p={[0, 0.3, 0]} rt={0.06} h={0.42} seg={8} c={PALETTE.wood} />
          <Sph p={[0, 0.55, 0]} rad={0.12} detail={1} c={PALETTE.woodDark} />
        </group>
      ) : null}
    </group>
  );
};

export const CastShards: React.FC<{ at: Vec3; t: number }> = ({ at, t }) => {
  if (t <= 0.001 || t >= 0.999) return null;
  return (
    <group position={at}>
      {Array.from({ length: 9 }, (_, i) => {
        const vx = randRange(`sx${i}`, -1, 1);
        const vy = randRange(`sy${i}`, 0.6, 1.4);
        const vz = randRange(`sz${i}`, -0.3, 1);
        const tt = t * 1.2;
        return <Box key={i} p={[vx * tt * 0.9, vy * tt * 1.1 - 2.2 * tt * tt, vz * tt * 0.8]} r={[tt * 6 + i, tt * 4, i]} s={[0.07, 0.05, 0.06]} c="#fbfbf8" />;
      })}
    </group>
  );
};

export const CapacityGauge: React.FC<{ pop: number; level: number }> = ({ pop, level }) => {
  const color = interpolateColors(clamp((1 - level) / 0.4, 0, 1), [0, 1], [PALETTE.green, "#ff8a1f"]);
  const w = 0.86 * clamp(level, 0, 1);
  return (
    <G p={[L.work[0], 2.18, L.work[2]]} s={clamp(pop, 0, 1.3)}>
      <Box s={[0.98, 0.2, 0.07]} c="#1d2b45" />
      <Box p={[-0.43 + w / 2, 0, 0.04]} s={[w, 0.13, 0.03]} c={color} emissive={color} ei={0.35} cast={false} />
    </G>
  );
};

/** Caixote + caixa com alça que escorrega da mão (cena 7). */
export const SlipBox: React.FC<{ grip: number; slip: number; bounce: number }> = ({ grip, slip, bounce }) => {
  const s = clamp(slip, 0, 1);
  const b = clamp(bounce, 0, 1.3);
  const hop = s >= 1 ? 0.28 * Math.abs(Math.sin(b * Math.PI * 1.5)) * Math.max(0, 1 - b) : 0;
  const y = 1.1 + 0.05 * clamp(grip, 0, 1) - (1.1 - 0.15) * s * s + hop;
  return (
    <group position={L.crate}>
      <Box p={[0, 0.475, 0]} s={[0.52, 0.95, 0.52]} c={PALETTE.wood} />
      <Box p={[0, 0.95, 0]} s={[0.54, 0.04, 0.54]} c={PALETTE.woodDark} />
      <group position={[0.32 * s, y, 0.32 * s]} rotation={[0.3 * s, 0, -0.9 * s + 0.2 * hop]}>
        <Box s={[0.4, 0.3, 0.34]} c={PALETTE.cardboard} />
        <Box p={[0, 0.151, 0]} s={[0.16, 0.01, 0.05]} c="#3a2a1a" cast={false} />
      </group>
    </group>
  );
};

export const Calendar: React.FC<{ pop: number; flip: number }> = ({ pop, flip }) => (
  <G p={L.calendar} r={[0, 0.25, 0]} s={clamp(pop, 0, 1.3)}>
    <Cyl p={[0, 0.55, 0]} rt={0.04} h={1.1} seg={6} c={PALETTE.woodDark} />
    <Box p={[0, 1.4, 0]} s={[0.78, 0.86, 0.04]} c="#ffffff" />
    <Box p={[0, 1.76, 0.025]} s={[0.78, 0.16, 0.02]} c={PALETTE.red} cast={false} />
    {[0, 1, 2].map((k) => {
      const a = clamp(flip * 3 - k, 0, 1);
      return (
        <group key={k} position={[0, 1.68, 0.03 + 0.008 * (3 - k)]} rotation={[-a * Math.PI * 0.95, 0, 0]}>
          <Box p={[0, -0.33, 0]} s={[0.74, 0.66, 0.006]} c={k % 2 ? "#f3f6fa" : "#ffffff"} />
          {Array.from({ length: 12 }, (_, i) => (
            <Box key={i} p={[-0.27 + (i % 4) * 0.18, -0.16 - Math.floor(i / 4) * 0.17, 0.006]} s={[0.12, 0.1, 0.003]} c={i === 5 + k ? PALETTE.coinGold : "#d9e2ec"} cast={false} />
          ))}
        </group>
      );
    })}
  </G>
);

/** Mini-cenários da cena 10: estrada com moto, casinha com poça e campinho. */
export const MiniRoad: React.FC<{ pop: number; tipDeg: number; frame: number; children?: React.ReactNode }> = ({ pop, tipDeg, children }) => (
  <G p={L.road} r={[0, 0.25, 0]} s={clamp(pop, 0, 1.3)}>
    <Box p={[0, 0.02, 0]} s={[2.8, 0.04, 1.0]} c="#4b5058" cast={false} />
    {[-1, -0.35, 0.3, 0.95].map((x) => (
      <Box key={x} p={[x, 0.045, 0]} s={[0.35, 0.01, 0.06]} c="#ffffff" cast={false} />
    ))}
    <group position={[0, 0.04, 0.1]} rotation={[(-tipDeg * Math.PI) / 180, 0, 0]}>
      <Box p={[0, 0.42, 0]} s={[0.75, 0.24, 0.2]} c="#d63c3c" />
      <Box p={[-0.1, 0.58, 0]} s={[0.36, 0.08, 0.2]} c="#2a2f38" />
      <Box p={[0.35, 0.68, 0]} s={[0.06, 0.32, 0.06]} c="#2a2f38" />
      <Box p={[0.35, 0.84, 0]} s={[0.06, 0.04, 0.42]} c="#2a2f38" />
      <Torus p={[-0.36, 0.2, 0]} rad={0.16} tube={0.06} seg={10} c="#1b1d22" />
      <Torus p={[0.4, 0.2, 0]} rad={0.16} tube={0.06} seg={10} c="#1b1d22" />
    </group>
    {children}
  </G>
);

export const MiniHouse: React.FC<{ pop: number }> = ({ pop }) => (
  <G p={L.house} r={[0, -0.5, 0]} s={clamp(pop, 0, 1.3)}>
    <Box p={[0, 0.4, 0]} s={[1.0, 0.8, 0.85]} c="#ffe9c7" />
    <mesh position={[0, 1.0, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.66, 1, 0.42]} castShadow>
      <cylinderGeometry args={[1, 1, 1.0, 3, 1]} />
      <meshStandardMaterial color="#c0504d" flatShading roughness={0.85} />
    </mesh>
    <Box p={[0, 0.3, 0.43]} s={[0.26, 0.5, 0.02]} c="#7e5531" cast={false} />
    <Cyl p={[0.15, 0.012, 0.75]} rt={0.32} h={0.02} seg={10} c="#7fc8f8" opacity={0.85} cast={false} />
    <Box p={[0.32, 0.02, 0.62]} r={[0, 0.6, 0]} s={[0.12, 0.04, 0.22]} c="#3e4651" />
  </G>
);

export const MiniField: React.FC<{ pop: number; frame: number }> = ({ pop, frame }) => (
  <G p={L.field} r={[0, 0.2, 0]} s={clamp(pop, 0, 1.3)}>
    <Box p={[0, 0.015, 0]} s={[1.8, 0.03, 1.1]} c="#9bd365" cast={false} />
    <Box p={[0, 0.032, 0]} s={[0.03, 0.005, 1.1]} c="#ffffff" cast={false} />
    <group position={[0.75, 0, 0]}>
      <Box p={[0, 0.3, -0.35]} s={[0.04, 0.6, 0.04]} c="#ffffff" />
      <Box p={[0, 0.3, 0.35]} s={[0.04, 0.6, 0.04]} c="#ffffff" />
      <Box p={[0, 0.6, 0]} s={[0.04, 0.04, 0.74]} c="#ffffff" />
    </group>
    <Sph p={[-0.2, 0.1 + 0.12 * Math.abs(Math.sin(frame / 9)), 0.1]} rad={0.1} detail={1} c="#ffffff" />
  </G>
);

export const Check3D: React.FC<{ at: Vec3; s: number; frame: number }> = ({ at, s, frame }) => (
  <G p={at} r={[0, Math.sin(frame / 20) * 0.3, 0]} s={clamp(s, 0, 1.3)}>
    <Box p={[-0.1, -0.05, 0]} r={[0, 0, 0.8]} s={[0.1, 0.28, 0.08]} c={PALETTE.green} emissive={PALETTE.green} ei={0.45} />
    <Box p={[0.1, 0.07, 0]} r={[0, 0, -0.65]} s={[0.1, 0.5, 0.08]} c={PALETTE.green} emissive={PALETTE.green} ei={0.45} />
  </G>
);

/** Portão com catraca em frente ao INSS (passagem ao longo de x). */
export const Gate: React.FC<{ pop: number; open: number; block: number; light: string; frame: number }> = ({ pop, open, block, light }) => {
  const shake = block > 0.01 && block < 1.2 ? Math.sin(block * 18) * 0.12 * (1.2 - block) : 0;
  return (
    <G p={L.gate} s={clamp(pop, 0, 1.3)}>
      <Box p={[0, 0.55, -0.5]} s={[0.14, 1.1, 0.14]} c="#5f6b78" />
      <Box p={[0, 0.55, 0.5]} s={[0.14, 1.1, 0.14]} c="#5f6b78" />
      <Box p={[0, 1.12, 0]} s={[0.16, 0.08, 1.14]} c="#4b5560" />
      <Sph p={[0, 1.28, 0]} rad={0.12} detail={1} c={light} emissive={light} ei={0.9} />
      <group position={[0, 0.82, -0.45]} rotation={[0, -clamp(open, 0, 1) * 1.45 + shake, 0]}>
        <Box p={[0, 0, 0.45]} s={[0.06, 0.06, 0.9]} c="#e5383b" />
      </group>
    </G>
  );
};

export const BigCoin: React.FC<{ pop: number; spinDeg: number; split: number; drop: number }> = ({ pop, spinDeg, split, drop }) => {
  const base: Vec3 = [1.3, 3.55, 2.0];
  const sp = clamp(split, 0, 1);
  const d = clamp(drop, 0, 1);
  const right = v3.lerp([base[0] + 0.3 * sp, base[1], base[2]], [L.slot[0] + 0.05, L.slot[1] + 0.05, L.slot[2]], d);
  return (
    <G p={[0, 0, 0]} s={clamp(pop, 0, 1.3)}>
      <group position={[base[0] - 0.3 * sp, base[1], base[2]]} rotation={[Math.PI / 2, (spinDeg * Math.PI) / 180, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.55, 0.55, 0.1, 20, 1, false, Math.PI, Math.PI]} />
          <meshStandardMaterial color={PALETTE.coinGold} metalness={0.6} roughness={0.3} emissive={PALETTE.coinGold} emissiveIntensity={0.2} flatShading />
        </mesh>
      </group>
      <group position={right} rotation={[Math.PI / 2, (spinDeg * Math.PI) / 180, 0]} scale={1 - 0.75 * d}>
        <mesh castShadow>
          <cylinderGeometry args={[0.55, 0.55, 0.1, 20, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color={PALETTE.coinGold} metalness={0.6} roughness={0.3} emissive={PALETTE.coinGold} emissiveIntensity={0.25} flatShading />
        </mesh>
      </group>
    </G>
  );
};

/** Linha do tempo no chão: do cofrinho até a cadeira de balanço (aposentadoria). */
export const Timeline: React.FC<{ grow: number; coins: number; chair: number; stop: number; frame: number }> = ({ grow, coins, chair, stop, frame }) => {
  const a: Vec3 = [L.piggy[0] - 0.2, 0.025, 3.35];
  const b: Vec3 = [L.chair[0] + 0.6, 0.025, L.chair[2] - 0.1];
  const g = clamp(grow, 0, 1);
  const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const ang = Math.atan2(-(b[2] - a[2]), b[0] - a[0]);
  return (
    <group>
      {g > 0.002 ? (
        <group position={a} rotation={[0, ang, 0]}>
          <Box p={[(len * g) / 2, 0, 0]} s={[len * g, 0.03, 0.3]} c="#ffe8a3" cast={false} />
          {Array.from({ length: 10 }, (_, i) => ((i + 1) / 11 <= g ? <Box key={i} p={[(len * (i + 1)) / 11, 0.02, 0]} s={[0.04, 0.03, 0.38]} c="#c9a227" cast={false} /> : null))}
          {Array.from({ length: 6 }, (_, i) => {
            const u = ((i / 6 + frame * 0.008) % 1) * g;
            const sc = clamp(coins, 0, 1) * clamp((g - u) * 10, 0, 1);
            if (sc < 0.02) return null;
            return <Cyl key={`c${i}`} p={[len * u, 0.12, 0]} r={[Math.PI / 2, 0, frame * 0.1]} rt={0.09} h={0.03} seg={10} c={PALETTE.coinGold} metal />;
          })}
        </group>
      ) : null}
      <G p={L.chair} r={[0, 0.5, 0]} s={clamp(chair, 0, 1.3)}>
        <Box p={[0, 0.45, 0]} s={[0.55, 0.06, 0.5]} c={PALETTE.wood} />
        <Box p={[0, 0.85, -0.24]} r={[-0.15, 0, 0]} s={[0.55, 0.75, 0.05]} c={PALETTE.wood} />
        {[-0.25, 0.25].map((x) => (
          <group key={x}>
            <Box p={[x, 0.25, 0]} s={[0.05, 0.4, 0.05]} c={PALETTE.woodDark} />
            <Torus p={[x, 0.55, 0]} r={[0, Math.PI / 2, Math.PI]} rad={0.55} tube={0.03} arc={Math.PI * 0.42} seg={8} c={PALETTE.woodDark} />
          </group>
        ))}
        <Box p={[0.15, 0.53, 0.05]} s={[0.3, 0.1, 0.25]} c="#e57373" />
      </G>
      <G p={[L.chair[0] + 0.85, 0, L.chair[2] - 0.35]} s={clamp(stop, 0, 1.3)}>
        <Cyl p={[0, 0.5, 0]} rt={0.03} h={1.0} seg={6} c="#9aa3ad" />
        <Cyl p={[0, 1.12, 0]} r={[Math.PI / 2, 0, Math.PI / 8]} rt={0.24} h={0.04} seg={8} c={PALETTE.red} emissive={PALETTE.red} ei={0.3} />
        <Box p={[0, 1.12, 0.025]} s={[0.3, 0.07, 0.01]} c="#ffffff" cast={false} />
      </G>
    </group>
  );
};

export const Padlock: React.FC<{ at: Vec3; drop: number; brk: number }> = ({ at, drop, brk }) => {
  if (drop <= 0.001) return null;
  const b = clamp(brk, 0, 1);
  const y = (1 - clamp(drop, 0, 1.15)) * 1.6;
  if (b >= 0.999) return null;
  return (
    <group position={[at[0], at[1] + y, at[2]]}>
      {b < 0.02 ? (
        <>
          <Box p={[0, -0.12, 0]} s={[0.26, 0.22, 0.1]} c="#c9a227" metal />
          <Torus p={[0, 0, 0]} rad={0.09} tube={0.025} arc={Math.PI} seg={10} c="#9aa3ad" metal />
          <Cyl p={[0, -0.12, 0.052]} r={[Math.PI / 2, 0, 0]} rt={0.025} h={0.01} seg={6} c="#3a2a1a" cast={false} />
        </>
      ) : (
        Array.from({ length: 6 }, (_, i) => {
          const vx = randRange(`px${i}`, -1, 1);
          const vy = randRange(`py${i}`, 0.3, 1.2);
          return <Box key={i} p={[vx * b * 0.8, vy * b * 0.9 - 2 * b * b, randRange(`pz${i}`, -0.5, 0.8) * b]} r={[b * 7 + i, b * 5, 0]} s={[0.09, 0.08, 0.06]} c={i % 2 ? "#c9a227" : "#9aa3ad"} metal />;
        })
      )}
    </group>
  );
};

export const Folder: React.FC<{ at: Vec3; pop: number }> = ({ at, pop }) => (
  <G p={at} r={[0, -0.3, 0.1]} s={clamp(pop, 0, 1.3)}>
    <Box s={[0.34, 0.42, 0.05]} c="#1e63c8" />
    <Box p={[0.02, 0.23, 0]} s={[0.26, 0.1, 0.03]} c="#ffffff" cast={false} />
    <Box p={[-0.04, 0.24, -0.01]} r={[0, 0, 0.15]} s={[0.22, 0.12, 0.02]} c="#2b3440" cast={false} />
  </G>
);

export const Phone: React.FC<{ at: Vec3; pop: number; ring: number; frame: number }> = ({ at, pop, ring, frame }) => {
  const shake = ring > 0.01 && ring < 0.99 ? Math.sin(frame * 1.6) * 0.07 : 0;
  return (
    <G p={at} r={[0, 0.25, shake]} s={clamp(pop, 0, 1.3)}>
      <Box s={[0.24, 0.44, 0.035]} c="#1b1f26" />
      <Box p={[0, 0.0, 0.019]} s={[0.21, 0.38, 0.004]} c="#3b82f6" emissive="#3b82f6" ei={0.7} cast={false} />
    </G>
  );
};

export const Gavel: React.FC<{ at: Vec3; swingDeg: number }> = ({ at, swingDeg }) => (
  <group position={at} rotation={[(swingDeg * Math.PI) / 180, 0, 0]}>
    <Cyl p={[0, 0.16, 0]} rt={0.015} h={0.32} seg={6} c={PALETTE.woodDark} />
    <Cyl p={[0, 0.34, 0]} r={[0, 0, Math.PI / 2]} rt={0.06} h={0.2} seg={8} c={PALETTE.wood} />
  </group>
);

/** Chuva de moedas (gancho e "o melhor"). */
export const CoinRain: React.FC<{ amount: number; frame: number }> = ({ amount, frame }) => {
  if (amount <= 0.01) return null;
  return (
    <group>
      {Array.from({ length: 36 }, (_, i) => {
        const x = randRange(`cx${i}`, -2.2, 3.0);
        const z = randRange(`cz${i}`, 0.6, 3.4);
        const sp = randRange(`cs${i}`, 0.07, 0.12);
        const y = 7.5 - ((frame * sp + randRange(`co${i}`, 0, 7.5)) % 7.5);
        return (
          <mesh key={i} position={[x, y, z]} rotation={[frame * 0.2 + i, i, frame * 0.13]} scale={clamp(amount, 0, 1)}>
            <cylinderGeometry args={[0.13, 0.13, 0.035, 12]} />
            <meshStandardMaterial color={PALETTE.coinGold} metalness={0.6} roughness={0.3} emissive={PALETTE.coinGold} emissiveIntensity={0.3} flatShading />
          </mesh>
        );
      })}
    </group>
  );
};

/** Casa da Dona Maria (no lugar do depósito). */
export const Home: React.FC = () => {
  const [w, h, d] = L.warehouseSize;
  return (
    <group position={L.warehouse}>
      <Box p={[0, h * 0.42, 0]} s={[w * 0.85, h * 0.84, d * 0.85]} c="#ffe3a8" />
      <mesh position={[0, h * 0.84 + 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[(w * 0.85 + 0.4) / 1.732, 1, 0.8]} castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, d * 0.85 + 0.3, 3, 1]} />
        <meshStandardMaterial color="#d9643a" roughness={0.85} flatShading />
      </mesh>
      <Box p={[0.3, 0.75, (d * 0.85) / 2 + 0.01]} s={[0.75, 1.5, 0.04]} c="#7e5531" cast={false} />
      <Sph p={[0.55, 0.75, (d * 0.85) / 2 + 0.05]} rad={0.04} detail={0} c={PALETTE.gold} cast={false} />
      {[-1.05, 1.15].map((x) => (
        <group key={x}>
          <Box p={[x, 1.55, (d * 0.85) / 2 + 0.02]} s={[0.6, 0.55, 0.03]} c="#9fd3f2" cast={false} />
          <Box p={[x, 1.25, (d * 0.85) / 2 + 0.1]} s={[0.7, 0.12, 0.18]} c="#8b5a2b" />
          {[-0.2, 0, 0.2].map((dx) => (
            <Sph key={dx} p={[x + dx, 1.36, (d * 0.85) / 2 + 0.1]} rad={0.08} detail={0} c={dx === 0 ? "#ff6b9a" : "#ffd43b"} />
          ))}
        </group>
      ))}
      <Box p={[0.3, 0.05, (d * 0.85) / 2 + 0.45]} s={[1.3, 0.1, 0.8]} c="#d9d2c3" />
    </group>
  );
};

/** Mesa com as moedas da renda da família (split separa por pessoa). */
export const IncomeTable: React.FC<{ at: Vec3; pop: number; amount: number; split: number }> = ({ at, pop, amount, split }) => {
  const n = Math.max(1, Math.round(clamp(amount, 0, 1) * 8));
  const sp = clamp(split, 0, 1);
  return (
    <G p={at} s={clamp(pop, 0, 1.3)}>
      <Box p={[0, 0.7, 0]} s={[1.0, 0.06, 0.6]} c={PALETTE.wood} />
      {[-0.42, 0.42].map((x) => (
        <Box key={x} p={[x, 0.35, 0]} s={[0.06, 0.7, 0.5]} c={PALETTE.woodDark} />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const left = i % 2 === 0;
        const k = Math.floor(i / 2);
        const x = sp > 0 ? (left ? -0.25 : 0.25) * sp : 0;
        const y = 0.75 + (sp > 0 ? k : i) * 0.032;
        return <Cyl key={i} p={[x, y, 0]} rt={0.11} h={0.03} seg={12} c="#f2c94c" emissive="#f2c94c" ei={0.2} metal />;
      })}
    </G>
  );
};

/** Moeda gigante dividida em 4 fatias: uma fatia se destaca (1/4). */
export const QuarterCoin: React.FC<{ pop: number; slice: number; spinDeg: number }> = ({ pop, slice, spinDeg }) => {
  const s = clamp(slice, 0, 1);
  return (
    <G p={[1.3, 3.5, 2.0]} r={[Math.PI / 2, (spinDeg * Math.PI) / 180, 0]} s={clamp(pop, 0, 1.3)}>
      {[0, 1, 2, 3].map((q) => {
        const hi = q === 0;
        const ang = q * (Math.PI / 2) + Math.PI / 4;
        const off = hi ? 0.35 * s : 0;
        return (
          <mesh key={q} position={[Math.sin(ang) * off, 0, Math.cos(ang) * off]} castShadow>
            <cylinderGeometry args={[0.6, 0.6, 0.1, 16, 1, false, q * (Math.PI / 2), Math.PI / 2 - 0.04]} />
            <meshStandardMaterial color={hi ? PALETTE.coinGold : "#c9a227"} metalness={0.6} roughness={0.3} emissive={hi ? PALETTE.coinGold : "#000000"} emissiveIntensity={hi ? 0.35 * s : 0} flatShading opacity={hi ? 1 : 1 - 0.55 * s} transparent />
          </mesh>
        );
      })}
    </G>
  );
};

/** Cartão do Cadastro Único. */
export const CadCard: React.FC<{ at: Vec3; pop: number; frame: number }> = ({ at, pop, frame }) => (
  <G p={at} r={[0, Math.sin(frame / 12) * 0.25, 0.05]} s={clamp(pop, 0, 1.3)}>
    <Box s={[0.9, 0.56, 0.04]} c="#1f8f4e" />
    <Box p={[0, 0.17, 0.022]} s={[0.9, 0.1, 0.005]} c="#ffd43b" cast={false} />
    <Box p={[-0.25, -0.06, 0.022]} s={[0.25, 0.25, 0.005]} c="#ffffff" cast={false} />
    {[0, 1, 2].map((i) => (
      <Box key={i} p={[0.15, -0.0 - i * 0.08, 0.022]} s={[0.4, 0.035, 0.005]} c="#d7f5e3" cast={false} />
    ))}
  </G>
);

/** Cama (ao longo de z, cabeceira em -z). */
export const Bed: React.FC<{ at: Vec3 }> = ({ at }) => (
  <group position={at}>
    <Box p={[0, 0.25, 0]} s={[1.1, 0.5, 2.1]} c={PALETTE.wood} />
    <Box p={[0, 0.56, 0.05]} s={[1.0, 0.14, 1.95]} c="#ffffff" />
    <Box p={[0, 0.66, -0.75]} s={[0.7, 0.12, 0.35]} c="#dfe9f5" />
    <Box p={[0, 0.62, 0.45]} s={[1.04, 0.08, 1.1]} c="#7fb2e5" />
    <Box p={[0, 0.75, -1.05]} s={[1.1, 0.9, 0.08]} c={PALETTE.woodDark} />
  </group>
);

/** Fileira de 12 contribuições (pilhas de moedas que acendem uma a uma). */
export const ContributionRow: React.FC<{ count: number; pop: number; frame: number }> = ({ count, pop, frame }) => (
  <G p={[1.3, 0, 3.55]} s={clamp(pop, 0, 1.3)}>
    {Array.from({ length: 12 }, (_, i) => {
      const lit = count >= i + 1;
      const x = (i - 5.5) * 0.24;
      const h = 0.18 + 0.03 * (i % 3);
      const bounce = lit ? 0.04 * Math.max(0, Math.sin((frame - i * 3) / 4)) : 0;
      return (
        <group key={i} position={[x, bounce, 0]}>
          <Cyl p={[0, h / 2, 0]} rt={0.09} h={h} seg={10} c={lit ? PALETTE.coinGold : "#9aa3ad"} emissive={lit ? PALETTE.coinGold : undefined} ei={lit ? 0.35 : 0} metal />
        </group>
      );
    })}
  </G>
);

/** Mesinha de manicure com esmaltes. */
export const ManicureTable: React.FC<{ at: Vec3; pop: number }> = ({ at, pop }) => (
  <G p={at} s={clamp(pop, 0, 1.3)}>
    <Box p={[0, 0.6, 0]} s={[0.6, 0.05, 0.45]} c="#ffffff" />
    <Cyl p={[0, 0.3, 0]} rt={0.05} h={0.6} seg={6} c="#d0d6de" />
    {["#ff3b6b", "#a855f7", "#ff9f1c", "#22c55e"].map((c, i) => (
      <group key={c} position={[-0.2 + i * 0.13, 0.68, 0.05]}>
        <Cyl p={[0, 0, 0]} rt={0.035} h={0.1} seg={8} c={c} />
        <Cyl p={[0, 0.07, 0]} rt={0.015} h={0.05} seg={6} c="#2a2f38" />
      </group>
    ))}
  </G>
);

/** Berço com o bebê. */
export const Crib: React.FC<{ at: Vec3; pop: number; frame: number; children?: React.ReactNode }> = ({ at, pop, children }) => (
  <G p={at} s={clamp(pop, 0, 1.3)}>
    <Box p={[0, 0.45, 0]} s={[0.9, 0.08, 0.55]} c="#ffffff" />
    {Array.from({ length: 8 }, (_, i) => (
      <Box key={i} p={[-0.42 + i * 0.12, 0.62, 0.27]} s={[0.03, 0.35, 0.03]} c="#ffd1e3" />
    ))}
    {Array.from({ length: 8 }, (_, i) => (
      <Box key={`b${i}`} p={[-0.42 + i * 0.12, 0.62, -0.27]} s={[0.03, 0.35, 0.03]} c="#ffd1e3" />
    ))}
    <Box p={[0, 0.8, 0.27]} s={[0.9, 0.04, 0.04]} c="#ffb3cf" />
    <Box p={[0, 0.8, -0.27]} s={[0.9, 0.04, 0.04]} c="#ffb3cf" />
    {[-0.42, 0.42].map((x) => (
      <Box key={x} p={[x, 0.4, 0]} s={[0.05, 0.8, 0.55]} c="#ffb3cf" />
    ))}
    <group position={[0, 0.56, 0]}>{children}</group>
  </G>
);

/** Martelo gigante do STF batendo num bloco. swing 0 = levantado, 1 = batida. */
export const BigGavel: React.FC<{ at: Vec3; pop: number; swing: number }> = ({ at, pop, swing }) => (
  <G p={at} s={clamp(pop, 0, 1.3)}>
    <Box p={[0, -0.75, 0]} s={[0.9, 0.3, 0.9]} c={PALETTE.woodDark} />
    <group position={[0.85, -0.45, 0]} rotation={[0, 0, -(1 - clamp(swing, 0, 1.1)) * 1.0]}>
      <Cyl p={[-0.55, 0, 0]} r={[0, 0, Math.PI / 2]} rt={0.05} h={1.1} seg={8} c={PALETTE.wood} />
      <Cyl p={[-1.05, 0.0, 0]} rt={0.2} h={0.6} seg={10} c={PALETTE.woodDark} />
      <Cyl p={[-1.05, 0.0, 0]} rt={0.22} h={0.08} seg={10} c={PALETTE.gold} metal />
    </group>
  </G>
);

/** Parcelas do benefício: 5 pilhas grandes que acendem (count 0–5). */
export const ParcelRow: React.FC<{ count: number; pop: number; frame: number }> = ({ count, pop, frame }) => (
  <G p={[1.3, 0, 3.6]} s={clamp(pop, 0, 1.3)}>
    {Array.from({ length: 5 }, (_, i) => {
      const lit = count >= i + 1 - 0.001;
      const x = (i - 2) * 0.5;
      const h = 0.3 + i * 0.04;
      const bounce = lit ? 0.06 * Math.max(0, Math.sin((frame - i * 4) / 5)) : 0;
      return (
        <group key={i} position={[x, bounce, 0]}>
          <Cyl p={[0, h / 2, 0]} rt={0.18} h={h} seg={14} c={lit ? PALETTE.coinGold : "#9aa3ad"} emissive={lit ? PALETTE.coinGold : undefined} ei={lit ? 0.35 : 0} metal />
          <Cyl p={[0, h + 0.02, 0]} rt={0.19} h={0.03} seg={14} c={lit ? "#ffe08a" : "#b8c0c8"} metal />
        </group>
      );
    })}
  </G>
);

/** Porta-retrato na parede da casa (lembrança do seu José). */
export const PhotoFrame: React.FC<{ at: Vec3; pop: number }> = ({ at, pop }) => (
  <G p={at} s={clamp(pop, 0, 1.3)}>
    <Box s={[0.7, 0.85, 0.06]} c={PALETTE.wood} />
    <Box p={[0, 0, 0.035]} s={[0.56, 0.7, 0.01]} c="#bfe3ff" cast={false} />
    <Sph p={[0, 0.08, 0.05]} rad={0.13} detail={1} s={[1, 1, 0.3]} c="#c98e63" cast={false} />
    <Box p={[0, -0.2, 0.045]} s={[0.36, 0.18, 0.01]} c="#6d8fb3" cast={false} />
    <Cone p={[0.42, -0.35, 0.12]} r={[0, 0, 0.3]} rad={0.08} h={0.2} seg={6} c="#ff8fc1" />
  </G>
);

/** Estrelinha brilhante que sobe ao céu. */
export const RisingStar: React.FC<{ from: Vec3; t: number; frame: number }> = ({ from, t, frame }) => {
  if (t <= 0.001 || t >= 0.999) return null;
  return (
    <group position={[from[0], from[1] + t * 5, from[2]]} rotation={[0, frame * 0.1, 0]} scale={0.6 + 0.4 * Math.sin(t * Math.PI)}>
      <mesh>
        <octahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial color="#fff3b0" emissive="#ffd43b" emissiveIntensity={1.2} flatShading />
      </mesh>
    </group>
  );
};

/** Barra de porcentagem 3D (level 0–1), com marcas a cada 10 %. */
export const PercentBar: React.FC<{ at: Vec3; pop: number; level: number }> = ({ at, pop, level }) => {
  const h = 2.6;
  const l = clamp(level, 0, 1);
  return (
    <G p={at} s={clamp(pop, 0, 1.3)}>
      <Box p={[0, h / 2, 0]} s={[0.7, h, 0.4]} c="#1d2b45" opacity={0.85} />
      {l > 0.005 ? <Box p={[0, (h * l) / 2, 0.05]} s={[0.6, h * l, 0.36]} c={PALETTE.coinGold} emissive={PALETTE.coinGold} ei={0.35} /> : null}
      {Array.from({ length: 9 }, (_, i) => (
        <Box key={i} p={[0.38, (h * (i + 1)) / 10, 0.21]} s={[0.12, 0.025, 0.01]} c="#ffffff" cast={false} />
      ))}
    </G>
  );
};
