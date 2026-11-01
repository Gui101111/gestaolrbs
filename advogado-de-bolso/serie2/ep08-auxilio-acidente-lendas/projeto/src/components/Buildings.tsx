import { L } from "../layout";
import { PALETTE } from "../theme";
import { Box, Cyl, Sph } from "./prims";

// Depósito (a empresa do Marcos) e prédio do INSS. Portas viradas para a frente (+z).

export const Warehouse: React.FC = () => {
  const [w, h, d] = L.warehouseSize;
  return (
    <group position={L.warehouse}>
      <Box p={[0, h / 2, 0]} s={[w, h, d]} c={PALETTE.wall} />
      {/* faixa e telhado em duas águas */}
      <Box p={[0, 0.25, d / 2 + 0.01]} s={[w, 0.5, 0.02]} c={PALETTE.wallShade} cast={false} />
      <mesh position={[0, h + 0.335, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[(w + 0.25) / 1.732, 1, 0.67]} castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, d + 0.3, 3, 1]} />
        <meshStandardMaterial color={PALETTE.roof} roughness={0.85} flatShading />
      </mesh>
      {/* portão aberto (vão escuro) e porta de enrolar recolhida */}
      <Box p={[0.4, 1.05, d / 2 + 0.01]} s={[2.0, 2.1, 0.04]} c="#3a3f47" cast={false} />
      <Box p={[0.4, 2.2, d / 2 + 0.06]} s={[2.2, 0.22, 0.12]} c="#9aa3ad" />
      {/* caixas lá dentro e na porta */}
      <Box p={[-0.1, 0.25, d / 2 + 0.35]} s={[0.5, 0.5, 0.5]} c={PALETTE.cardboard} />
      <Box p={[0.45, 0.22, d / 2 + 0.3]} s={[0.44, 0.44, 0.44]} c="#d8ab6c" />
      <Box p={[0.15, 0.68, d / 2 + 0.33]} s={[0.42, 0.38, 0.42]} c="#b98a4e" />
      {/* janelas */}
      {[-1.45, 1.6].map((x) => (
        <Box key={x} p={[x, 2.45, d / 2 + 0.02]} s={[0.55, 0.4, 0.03]} c="#9fd3f2" cast={false} />
      ))}
    </group>
  );
};

export const Inss: React.FC<{ glow: number; review: number }> = ({ glow, review }) => {
  const [w, h, d] = L.inssSize;
  const lamp = review > 0.01 ? "#ffd43b" : "#7fd0ff";
  const lampI = review > 0.01 ? 0.6 + 0.6 * review : 0.15 + 0.85 * glow;
  return (
    <group position={L.inss}>
      {/* degraus */}
      <Box p={[0, 0.08, 0.15]} s={[w + 0.5, 0.16, d + 0.9]} c="#d9dde2" />
      <Box p={[0, 0.22, 0.05]} s={[w + 0.2, 0.14, d + 0.5]} c="#e6e9ec" />
      {/* corpo */}
      <Box p={[0, 0.29 + (h - 0.3) / 2, -0.2]} s={[w - 0.3, h - 0.3, d - 0.6]} c={PALETTE.wall} />
      {/* colunas */}
      {[-1.45, -0.5, 0.5, 1.45].map((x) => (
        <Cyl key={x} p={[x, 0.29 + 1.25, d / 2 - 0.05]} rt={0.17} h={2.5} seg={8} c={PALETTE.column} />
      ))}
      {/* entablamento e frontão azul */}
      <Box p={[0, 2.95, 0.1]} s={[w + 0.1, 0.32, d]} c={PALETTE.inssBlue} />
      <mesh position={[0, 3.11 + 0.235, 0.1]} rotation={[-Math.PI / 2, 0, 0]} scale={[(w + 0.1) / 1.732, 1, 0.47]} castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, d, 3, 1]} />
        <meshStandardMaterial color={PALETTE.inssBlue} roughness={0.85} flatShading />
      </mesh>
      {/* emblema/luz no frontão: acende quando o INSS "age" */}
      <Sph p={[0, 3.36, d / 2 + 0.62]} rad={0.2} detail={1} c={lamp} emissive={lamp} ei={lampI} />
      {/* porta */}
      <Box p={[0, 1.15, d / 2 - 0.66]} s={[0.9, 1.7, 0.04]} c="#304a7a" cast={false} />
    </group>
  );
};
