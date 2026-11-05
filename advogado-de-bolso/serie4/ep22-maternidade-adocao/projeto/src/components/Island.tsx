import { L } from "../layout";
import { PALETTE } from "../theme";
import { randRange } from "../utils/animation";
import { Cone, Cyl, Sph } from "./prims";

// Ilha flutuante (maquete): gramado oval, laterais de terra, pedestal escuro, árvores e caminho de pedras.

const TREES: [number, number, number][] = [
  [-5.6, -3.2, 1.0],
  [-5.2, 1.4, 0.85],
  [5.6, -3.6, 0.95],
  [-1.2, -7.4, 0.8],
  [0.4, -7.6, 0.75],
  [5.3, 3.9, 0.7],
  [-5.4, 5.1, 0.7],
];

const STONES: [number, number][] = [
  [-2.3, -0.9],
  [-1.9, -0.2],
  [-1.5, 0.5],
  [-1.15, 1.2],
];

export const Island: React.FC = () => {
  const [cx, , cz] = L.islandCenter;
  const [rx, rz] = L.islandRadius;
  return (
    <group>
      {/* gramado */}
      <mesh position={[cx, -0.06, cz]} scale={[rx, 1, rz]} receiveShadow>
        <cylinderGeometry args={[1, 1, 0.12, 14]} />
        <meshStandardMaterial color={PALETTE.grass} roughness={0.95} flatShading />
      </mesh>
      {/* terra */}
      <mesh position={[cx, -0.95, cz]} scale={[rx, 1, rz]} castShadow receiveShadow>
        <cylinderGeometry args={[0.995, 0.82, 1.7, 14]} />
        <meshStandardMaterial color={PALETTE.dirt} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[cx, -2.05, cz]} scale={[rx * 0.82, 1, rz * 0.82]}>
        <cylinderGeometry args={[1, 0.55, 0.6, 14]} />
        <meshStandardMaterial color={PALETTE.dirtDark} roughness={0.95} flatShading />
      </mesh>
      {/* caminho de pedras do depósito até a casa */}
      {STONES.map(([x, z], i) => (
        <Cyl key={i} p={[x, 0.01, z]} rt={0.24} h={0.04} seg={7} c="#d9d2c3" cast={false} />
      ))}
      {/* árvores */}
      {TREES.map(([x, z, s], i) => (
        <group key={i} position={[x, 0, z]} scale={s}>
          <Cyl p={[0, 0.45, 0]} rt={0.12} rb={0.16} h={0.9} seg={6} c={PALETTE.woodDark} />
          <Cone p={[0, 1.35, 0]} rad={0.75} h={1.3} c={PALETTE.grassDark} />
          <Cone p={[0, 1.95, 0]} rad={0.55} h={1.0} c="#7dbb4a" />
        </group>
      ))}
      {/* pedrinhas e tufos */}
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 + 0.3;
        const x = cx + Math.cos(a) * rx * randRange(`rk${i}`, 0.78, 0.9);
        const z = cz + Math.sin(a) * rz * randRange(`rz${i}`, 0.78, 0.9);
        return i % 2 ? (
          <Sph key={i} p={[x, 0.06, z]} rad={randRange(`rs${i}`, 0.12, 0.22)} detail={0} c="#a7a9a3" />
        ) : (
          <Cone key={i} p={[x, 0.12, z]} rad={0.14} h={0.28} seg={5} c="#5f9a35" />
        );
      })}
    </group>
  );
};
