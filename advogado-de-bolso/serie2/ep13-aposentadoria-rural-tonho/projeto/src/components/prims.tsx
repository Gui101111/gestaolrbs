import type { ReactNode } from "react";
import { MATTE } from "../theme";
import type { Vec3 } from "../utils/animation";

// Primitivas low-poly com acabamento fosco (flatShading) usadas por todo o diorama.

type Common = { p?: Vec3; r?: Vec3; c: string; cast?: boolean; receive?: boolean; emissive?: string; ei?: number; opacity?: number; metal?: boolean; children?: ReactNode };

const Mat: React.FC<Pick<Common, "c" | "emissive" | "ei" | "opacity" | "metal">> = ({ c, emissive, ei = 0, opacity, metal }) => (
  <meshStandardMaterial
    {...MATTE}
    color={c}
    emissive={emissive ?? "#000000"}
    emissiveIntensity={ei}
    roughness={metal ? 0.35 : MATTE.roughness}
    metalness={metal ? 0.6 : 0}
    transparent={opacity !== undefined && opacity < 1}
    opacity={opacity ?? 1}
    depthWrite={opacity === undefined || opacity >= 1}
  />
);

export const Box: React.FC<Common & { s: Vec3 }> = ({ p = [0, 0, 0], r = [0, 0, 0], s, c, cast = true, receive = true, ...m }) => (
  <mesh position={p} rotation={r} castShadow={cast} receiveShadow={receive}>
    <boxGeometry args={s} />
    <Mat c={c} {...m} />
  </mesh>
);

export const Cyl: React.FC<Common & { rt: number; rb?: number; h: number; seg?: number; open?: boolean; theta?: number }> = ({
  p = [0, 0, 0],
  r = [0, 0, 0],
  rt,
  rb,
  h,
  seg = 10,
  theta,
  c,
  cast = true,
  receive = true,
  ...m
}) => (
  <mesh position={p} rotation={r} castShadow={cast} receiveShadow={receive}>
    <cylinderGeometry args={[rt, rb ?? rt, h, seg, 1, false, 0, theta ?? Math.PI * 2]} />
    <Mat c={c} {...m} />
  </mesh>
);

export const Sph: React.FC<Common & { rad: number; detail?: number; s?: Vec3 }> = ({ p = [0, 0, 0], r = [0, 0, 0], rad, detail = 1, s = [1, 1, 1], c, cast = true, receive = true, ...m }) => (
  <mesh position={p} rotation={r} scale={s} castShadow={cast} receiveShadow={receive}>
    <icosahedronGeometry args={[rad, detail]} />
    <Mat c={c} {...m} />
  </mesh>
);

export const Cone: React.FC<Common & { rad: number; h: number; seg?: number }> = ({ p = [0, 0, 0], r = [0, 0, 0], rad, h, seg = 7, c, cast = true, receive = true, ...m }) => (
  <mesh position={p} rotation={r} castShadow={cast} receiveShadow={receive}>
    <coneGeometry args={[rad, h, seg]} />
    <Mat c={c} {...m} />
  </mesh>
);

export const Torus: React.FC<Common & { rad: number; tube: number; arc?: number; seg?: number }> = ({ p = [0, 0, 0], r = [0, 0, 0], rad, tube, arc = Math.PI * 2, seg = 16, c, cast = true, receive = true, ...m }) => (
  <mesh position={p} rotation={r} castShadow={cast} receiveShadow={receive}>
    <torusGeometry args={[rad, tube, 6, seg, arc]} />
    <Mat c={c} {...m} />
  </mesh>
);

/** Grupo posicionado com escala uniforme (para "pop" de objetos). */
export const G: React.FC<{ p?: Vec3; r?: Vec3; s?: number | Vec3; children: ReactNode }> = ({ p = [0, 0, 0], r = [0, 0, 0], s = 1, children }) => {
  const sc: Vec3 = typeof s === "number" ? [s, s, s] : s;
  if (sc[0] <= 0.0005 && sc[1] <= 0.0005) return null;
  return (
    <group position={p} rotation={r} scale={sc}>
      {children}
    </group>
  );
};

export const v3 = {
  lerp: (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  add: (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  /** Arco parabólico de a até b com altura extra h. */
  arc: (a: Vec3, b: Vec3, t: number, h: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t],
  rotY: (v: Vec3, ang: number): Vec3 => [v[0] * Math.cos(ang) + v[2] * Math.sin(ang), v[1], -v[0] * Math.sin(ang) + v[2] * Math.cos(ang)],
};
