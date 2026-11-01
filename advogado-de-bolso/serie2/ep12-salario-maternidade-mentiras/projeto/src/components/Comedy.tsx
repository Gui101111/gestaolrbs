import { PALETTE } from "../theme";
import { clamp, randRange, type Vec3 } from "../utils/animation";
import { Box, Cone, Cyl, G, Sph } from "./prims";

// Kit de comédia/Halloween: abóboras, morcegos, lua, fantasma, X vermelho, óculos de "mito",
// bandeirinhas de forró e milharal. Tudo função pura do frame.

/** Abóbora de Halloween com rosto aceso. */
export const Pumpkin: React.FC<{ at: Vec3; s?: number; frame: number; seed?: number }> = ({ at, s = 1, frame, seed = 0 }) => {
  const flicker = 0.7 + 0.3 * Math.abs(Math.sin(frame / 5 + seed));
  return (
    <group position={at} scale={s} rotation={[0, seed, 0]}>
      <Sph p={[0, 0.28, 0]} rad={0.32} detail={1} s={[1.15, 0.85, 1.15]} c="#f07b1d" />
      <Cyl p={[0, 0.58, 0]} rt={0.04} rb={0.05} h={0.14} seg={6} c="#4a7a2a" />
      <Box p={[-0.11, 0.33, 0.33]} r={[0, 0, 0.8]} s={[0.09, 0.09, 0.03]} c="#ffd166" emissive="#ffb703" ei={1.2 * flicker} cast={false} />
      <Box p={[0.11, 0.33, 0.33]} r={[0, 0, 0.8]} s={[0.09, 0.09, 0.03]} c="#ffd166" emissive="#ffb703" ei={1.2 * flicker} cast={false} />
      <Box p={[0, 0.18, 0.34]} s={[0.22, 0.05, 0.03]} c="#ffd166" emissive="#ffb703" ei={1.2 * flicker} cast={false} />
    </group>
  );
};

/** Morcego batendo asas, em órbita. */
const Bat: React.FC<{ frame: number; i: number; center: Vec3; radius: number; height: number }> = ({ frame, i, center, radius, height }) => {
  const a = frame * 0.03 * (i % 2 ? 1 : -1) + i * 1.3;
  const flap = Math.sin(frame * 0.6 + i) * 0.7;
  return (
    <group position={[center[0] + Math.cos(a) * radius, height + Math.sin(frame / 15 + i) * 0.3, center[2] + Math.sin(a) * radius]} rotation={[0, -a, 0]}>
      <Sph rad={0.09} detail={0} c="#1b1426" />
      <Box p={[-0.17, 0, 0]} r={[0, 0, flap]} s={[0.26, 0.02, 0.14]} c="#2a1d3a" />
      <Box p={[0.17, 0, 0]} r={[0, 0, -flap]} s={[0.26, 0.02, 0.14]} c="#2a1d3a" />
    </group>
  );
};

export const HalloweenDecor: React.FC<{ frame: number }> = ({ frame }) => (
  <group>
    {[
      [-4.6, -0.6, 0.0],
      [-3.6, 2.6, 1.2],
      [4.6, 0.9, 2.1],
      [3.9, 3.2, 0.6],
      [-1.6, -6.0, 1.8],
      [0.2, 4.6, 2.6],
      [-2.3, 3.6, 3.4],
      [5.2, -2.6, 1.0],
      [0.05, -2.55, 0.4],
      [2.45, -2.75, 2.2],
      [-1.55, -2.8, 1.4],
    ].map(([x, z, seed], i) => (
      <Pumpkin key={i} at={[x, 0, z]} s={i % 3 === 0 ? 1.15 : 0.8} frame={frame} seed={seed} />
    ))}
    {Array.from({ length: 9 }, (_, i) => (
      <Bat key={i} frame={frame} i={i} center={[0, 0, -1.2]} radius={4 + (i % 3) * 1.6} height={4.6 + (i % 4) * 0.7} />
    ))}
    <mesh position={[-14, 22, -40]}>
      <icosahedronGeometry args={[4.2, 2]} />
      <meshStandardMaterial color="#fff6d6" emissive="#fff1b8" emissiveIntensity={0.9} flatShading />
    </mesh>
  </group>
);

/** Fantasma de lençol flutuando. */
export const Ghost: React.FC<{ at: Vec3; pop: number; frame: number; s?: number }> = ({ at, pop, frame, s = 1 }) => {
  const p = clamp(pop, 0, 1.3);
  if (p <= 0.002) return null;
  return (
    <group position={[at[0], at[1] + Math.sin(frame / 9) * 0.15, at[2]]} rotation={[0, Math.sin(frame / 20) * 0.3, Math.sin(frame / 13) * 0.08]} scale={p * s}>
      <Sph p={[0, 0.55, 0]} rad={0.42} detail={2} c="#f7f7ff" opacity={0.92} />
      <Cyl p={[0, 0.15, 0]} rt={0.42} rb={0.52} h={0.8} seg={12} c="#f7f7ff" opacity={0.92} />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + frame * 0.05;
        return <Sph key={i} p={[Math.cos(a) * 0.46, -0.27 + 0.04 * Math.sin(frame / 4 + i), Math.sin(a) * 0.46]} rad={0.12} detail={0} c="#f7f7ff" opacity={0.92} />;
      })}
      <Sph p={[-0.15, 0.62, 0.36]} rad={0.07} detail={0} s={[1, 1.4, 0.6]} c="#1a1a1a" />
      <Sph p={[0.15, 0.62, 0.36]} rad={0.07} detail={0} s={[1, 1.4, 0.6]} c="#1a1a1a" />
      <Sph p={[0, 0.42, 0.38]} rad={0.08} detail={0} s={[1, 1.3, 0.5]} c="#1a1a1a" />
    </group>
  );
};

/** X vermelho 3D (MITO / NEGADO). */
export const X3D: React.FC<{ at: Vec3; s: number; frame: number }> = ({ at, s, frame }) => (
  <G p={at} r={[0, Math.sin(frame / 20) * 0.3, 0]} s={clamp(s, 0, 1.3)}>
    <Box r={[0, 0, 0.78]} s={[0.12, 0.6, 0.1]} c={PALETTE.red} emissive={PALETTE.red} ei={0.5} />
    <Box r={[0, 0, -0.78]} s={[0.12, 0.6, 0.1]} c={PALETTE.red} emissive={PALETTE.red} ei={0.5} />
  </G>
);

/** Óculos escuros de "mito" (pixelados), caindo do céu até o rosto. drop 0 = no alto, 1 = no rosto. */
export const Shades: React.FC<{ at: Vec3; drop: number; ry?: number; s?: number }> = ({ at, drop, ry = 0, s = 1 }) => {
  const d = clamp(drop, 0, 1);
  if (d <= 0.001) return null;
  return (
    <group position={[at[0], at[1] + (1 - d) * 2.2, at[2]]} rotation={[0, ry, 0]} scale={s}>
      <group position={[0, 0, 0.19]}>
        <Box p={[0, 0.03, 0]} s={[0.46, 0.04, 0.03]} c="#0b0b0b" />
        {[-1, 1].map((k) => (
          <group key={k} position={[k * 0.11, -0.01, 0]}>
            <Box s={[0.17, 0.08, 0.03]} c="#0b0b0b" />
            <Box p={[-0.035, 0.01, 0.017]} s={[0.04, 0.025, 0.005]} c="#ffffff" cast={false} />
          </group>
        ))}
      </group>
    </group>
  );
};

/** Bandeirinhas de forró/festa no alpendre. */
export const Bunting: React.FC<{ from: Vec3; to: Vec3; frame: number }> = ({ from, to, frame }) => {
  const colors = ["#e63946", "#ffd166", "#06d6a0", "#118ab2", "#f78c6b", "#9b5de5"];
  const n = 14;
  return (
    <group>
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 0.5) / n;
        const x = from[0] + (to[0] - from[0]) * t;
        const z = from[2] + (to[2] - from[2]) * t;
        const y = from[1] + (to[1] - from[1]) * t - Math.sin(t * Math.PI) * 0.35;
        return <Cone key={i} p={[x, y - 0.1, z]} r={[Math.PI + Math.sin(frame / 8 + i) * 0.15, 0, 0]} rad={0.12} h={0.22} seg={3} c={colors[i % colors.length]} cast={false} />;
      })}
    </group>
  );
};

/** Milharal (fileiras de pés de milho). */
export const CornField: React.FC<{ at: Vec3; frame: number }> = ({ at, frame }) => (
  <group position={at}>
    <Box p={[0, 0.02, 0]} s={[2.2, 0.04, 2.6]} c="#8b5e34" cast={false} />
    {Array.from({ length: 4 }, (_, r) =>
      Array.from({ length: 5 }, (_, c) => {
        const x = -0.8 + r * 0.53;
        const z = -1.0 + c * 0.5;
        const h = randRange(`corn${r}-${c}`, 0.9, 1.25);
        const sway = Math.sin(frame / 18 + r + c) * 0.05;
        return (
          <group key={`${r}-${c}`} position={[x, 0, z]} rotation={[0, 0, sway]}>
            <Cyl p={[0, h / 2, 0]} rt={0.03} h={h} seg={5} c="#5f9a35" />
            <Cone p={[0.08, h * 0.65, 0]} r={[0, 0, -0.6]} rad={0.05} h={0.22} seg={5} c="#f4c430" />
            <Cone p={[0, h + 0.08, 0]} rad={0.06} h={0.18} seg={5} c="#7dbb4a" />
          </group>
        );
      }),
    )}
  </group>
);

/** Bola de futebol (rola com spin; quica via posição y calculada fora). */
export const Ball: React.FC<{ at: Vec3; spin: number }> = ({ at, spin }) => (
  <group position={at} rotation={[0, 0, -spin * 4]}>
    <Sph rad={0.16} detail={1} c="#fafafa" />
    {[[0, 0.15, 0], [0.13, -0.05, 0.06], [-0.12, -0.04, 0.08], [0.02, -0.06, -0.15], [-0.05, 0.06, 0.14]].map((p, i) => (
      <Sph key={i} p={p as Vec3} rad={0.05} detail={0} c="#1a1a1a" />
    ))}
  </group>
);
