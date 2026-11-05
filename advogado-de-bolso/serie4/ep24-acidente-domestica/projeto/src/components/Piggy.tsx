import { L } from "../layout";
import { PALETTE } from "../theme";
import { clamp } from "../utils/animation";
import { Box, Cone, Cyl, Sph, Torus } from "./prims";

// Cofrinho gigante do Marcos: corpo de "vidro" rosado (vê-se o interior) e colunas de moedas.
// level 0–1 = altura das colunas; split 0–1 separa prata (salário) de ouro (auxílio).

const COLS = [-0.48, -0.16, 0.16, 0.48];

export const Piggy: React.FC<{ level: number; split: number; frame: number }> = ({ level, split, frame }) => {
  const hMax = 1.32;
  return (
    <group position={L.piggy}>
      {/* pernas, focinho, orelhas, rabo (opacos) */}
      {[
        [-0.55, -0.42],
        [-0.55, 0.42],
        [0.55, -0.42],
        [0.55, 0.42],
      ].map(([x, z], i) => (
        <Cyl key={i} p={[x, 0.22, z]} rt={0.17} rb={0.15} h={0.44} seg={8} c={PALETTE.piggy} />
      ))}
      <Cyl p={[1.18, 1.18, 0]} r={[0, 0, Math.PI / 2]} rt={0.33} h={0.24} seg={10} c="#f48fb1" />
      <Sph p={[1.31, 1.24, 0.11]} rad={0.05} detail={0} c="#b0476b" cast={false} />
      <Sph p={[1.31, 1.24, -0.11]} rad={0.05} detail={0} c="#b0476b" cast={false} />
      <Cone p={[0.55, 2.05, 0.42]} r={[0.25, 0, -0.2]} rad={0.2} h={0.36} seg={4} c="#f48fb1" />
      <Cone p={[0.55, 2.05, -0.42]} r={[-0.25, 0, -0.2]} rad={0.2} h={0.36} seg={4} c="#f48fb1" />
      <Sph p={[0.92, 1.58, 0.42]} rad={0.07} detail={0} c="#1b1b1b" cast={false} />
      <Sph p={[0.92, 1.58, -0.42]} rad={0.07} detail={0} c="#1b1b1b" cast={false} />
      <Torus p={[-1.2, 1.25, 0]} r={[0, Math.PI / 2, 0]} rad={0.13} tube={0.04} arc={Math.PI * 1.5} c="#f48fb1" />
      {/* fenda */}
      <Box p={[0, 2.16, 0]} s={[0.5, 0.06, 0.12]} c="#7a2945" cast={false} />
      {/* moedas dentro */}
      {COLS.map((x, i) => {
        const gold = i >= 2 ? clamp(split * 1.4, 0, 1) : 0;
        const jitter = 0.92 + 0.08 * Math.sin(i * 1.7);
        const h = Math.max(0.02, level * hMax * jitter);
        const color = gold > 0.5 ? PALETTE.coinGold : i >= 2 && split < 0.01 && i % 2 === 1 ? PALETTE.coinGold : PALETTE.silver;
        const pulse = 1 + 0.02 * Math.sin(frame / 6 + i);
        return (
          <group key={i} position={[x * (1 + 0.25 * split), 0.42, (i % 2 ? 0.12 : -0.12) * (1 - split)]}>
            <Cyl p={[0, h / 2, 0]} rt={0.14 * pulse} h={h} seg={12} c={color} emissive={color} ei={0.22} metal />
            <Cyl p={[0, h + 0.012, 0]} rt={0.15} h={0.024} seg={12} c={color} emissive={color} ei={0.15} metal />
          </group>
        );
      })}
      {/* corpo de vidro */}
      <mesh position={[0, 1.2, 0]} scale={[1.18, 0.95, 0.92]}>
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial color="#ff9fc6" emissive="#ff7fb0" emissiveIntensity={0.18} roughness={0.25} metalness={0} flatShading transparent opacity={0.42} depthWrite={false} />
      </mesh>
    </group>
  );
};
