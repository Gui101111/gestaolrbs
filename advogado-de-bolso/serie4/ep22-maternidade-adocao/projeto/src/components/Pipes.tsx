import { useMemo } from "react";
import { CatmullRomCurve3, Quaternion, TubeGeometry, Vector3 } from "three";
import { PALETTE } from "../theme";
import { clamp, type Vec3 } from "../utils/animation";
import { Cyl, Sph, Torus } from "./prims";

// Cano transparente que "cresce" do prédio até o cofrinho e leva moedas (partículas puras do frame).

const UP = new Vector3(0, 1, 0);

/** Parâmetro (comprimento de arco 0–1) do ponto do cano mais próximo de p. */
export const closestU = (curve: CatmullRomCurve3, p: Vec3) => {
  const target = new Vector3(...p);
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i <= 400; i++) {
    const d = curve.getPointAt(i / 400).distanceTo(target);
    if (d < bestD) {
      bestD = d;
      best = i / 400;
    }
  }
  return best;
};

export type PipeProps = {
  points: Vec3[];
  grow: number;
  flow: number;
  tint: string;
  coin: string;
  frame: number;
  glow?: number;
  /** Válvula (ponto do cano mais próximo) e estado 0 = aberta, 1 = fechada. */
  valveAt?: Vec3;
  closed?: number;
  speed?: number;
  seed?: number;
};

export const Pipe: React.FC<PipeProps> = ({ points, grow, flow, tint, coin, frame, glow = 0, valveAt, closed = 0, speed = 0.011, seed = 0 }) => {
  const curve = useMemo(() => new CatmullRomCurve3(points.map((p) => new Vector3(...p)), false, "catmullrom", 0.4), [points]);
  const valveU = useMemo(() => (valveAt ? closestU(curve, valveAt) : undefined), [curve, valveAt]);
  const geo = useMemo(() => new TubeGeometry(curve, 90, 0.12, 10, false), [curve]);
  const g = clamp(grow, 0, 1);
  if (g <= 0.002) return null;
  const count = geo.index ? geo.index.count : 0;
  geo.setDrawRange(0, Math.floor((count * g) / 6) * 6);
  const head = curve.getPointAt(g);
  const coins: React.ReactNode[] = [];
  const N = 12;
  // moedas só avançam até a válvula quando ela está fechada
  const stopU = valveU !== undefined && closed > 0.5 ? valveU - 0.03 : 1;
  for (let i = 0; i < N; i++) {
    const u = (i / N + frame * speed + seed) % 1;
    if (u > g - 0.02 || u > stopU || u < 0.02) continue;
    const s = clamp(flow, 0, 1) * clamp((1 - u) * 12, 0, 1);
    if (s < 0.02) continue;
    const p = curve.getPointAt(u);
    coins.push(
      <mesh key={i} position={p} rotation={[frame * 0.15 + i, i, 0.4]} scale={s} castShadow>
        <cylinderGeometry args={[0.075, 0.075, 0.025, 10]} />
        <meshStandardMaterial color={coin} metalness={0.6} roughness={0.3} emissive={coin} emissiveIntensity={0.25} flatShading />
      </mesh>,
    );
  }
  let valve: React.ReactNode = null;
  if (valveU !== undefined && g > valveU) {
    const p = curve.getPointAt(valveU);
    const t = curve.getTangentAt(valveU);
    const q = new Quaternion().setFromUnitVectors(UP, t);
    const light = closed > 0.5 ? PALETTE.red : PALETTE.green;
    valve = (
      <group position={p}>
        <mesh quaternion={q} castShadow>
          <cylinderGeometry args={[0.19, 0.19, 0.3, 10]} />
          <meshStandardMaterial color="#7d8792" metalness={0.5} roughness={0.4} flatShading />
        </mesh>
        <Cyl p={[0, 0.2, 0]} rt={0.04} h={0.2} seg={6} c="#6b737c" />
        <group position={[0, 0.32, 0]} rotation={[0, closed * Math.PI * 1.5, 0]}>
          <Torus r={[Math.PI / 2, 0, 0]} rad={0.17} tube={0.035} seg={12} c={PALETTE.red} />
          <Cyl r={[0, 0, Math.PI / 2]} rt={0.02} h={0.34} seg={5} c={PALETTE.red} />
        </group>
        <Sph p={[0.24, 0.12, 0.05]} rad={0.07} detail={1} c={light} emissive={light} ei={0.9} cast={false} />
      </group>
    );
  }
  return (
    <group>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.12 + 0.5 * glow} roughness={0.2} transparent opacity={0.5} depthWrite={false} flatShading />
      </mesh>
      {/* colar no início e "cabeça" que cresce */}
      <Sph p={points[0]} rad={0.17} detail={1} c="#8b95a1" metal />
      {g < 0.995 ? <Sph p={[head.x, head.y, head.z]} rad={0.15} detail={1} c={tint} emissive={tint} ei={0.6} /> : null}
      {coins}
      {valve}
    </group>
  );
};
