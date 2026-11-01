import { useCurrentFrame } from "remotion";
import { isVisible, track } from "../data/scenes";
import { CAST, STAGE, THEME, type Actor } from "../layout";
import { PALETTE } from "../theme";
import { clamp, type Vec3 } from "../utils/animation";
import { Elder, Lia, Marcos, Pawn, WheelchairPerson, Woman } from "./Characters";
import { Ball, Bunting, CornField, Ghost, HalloweenDecor, Pumpkin, Shades, X3D } from "./Comedy";
import { Box, Cyl, G } from "./prims";
import { BigGavel, CadCard, Check3D, CoinRain, Folder } from "./Props";

// Palco da série 2 (comédia "mito"): elenco genérico dirigido por trilhas.
// Para cada ator `id`: vis(id) monta; trilhas `${id}.dx/.dz` (deslocamento), `.ry` (giro), `.pop` (escala, padrão 1),
// `.wave`, `.sad`, `.thumb`, `.point`, `.laugh` (gargalhada), `.shock` (susto), `.dance`, `.hop`, `.shades` (óculos de mito).

/** Altura dos olhos e escala do óculos por tipo de personagem. */
export const HEAD: Record<Actor["kind"], { y: number; s: number; z: number }> = {
  marcos: { y: 1.7, s: 1, z: 0 },
  cunhado: { y: 1.7, s: 1, z: 0 },
  tonho: { y: 1.7, s: 1, z: 0 },
  woman: { y: 1.59, s: 0.86, z: -0.02 },
  vizinha: { y: 1.59, s: 0.86, z: -0.02 },
  elder: { y: 1.46, s: 0.86, z: -0.02 },
  sogra: { y: 1.46, s: 0.86, z: -0.02 },
  lia: { y: 0.255, s: 0.23, z: -0.13 },
  ghost: { y: 0.6, s: 1.1, z: 0.1 },
  pawn: { y: 1.4, s: 0.85, z: -0.03 },
  kid: { y: 1.7, s: 1, z: 0 },
  wheel: { y: 1.2, s: 0.85, z: 0 },
};

/** Movimentos cômicos aplicados no grupo do personagem (qualquer tipo). */
export const comedyMotion = (id: string, frame: number) => {
  const T = (n: string) => track(n, frame);
  const laugh = clamp(T(`${id}.laugh`), 0, 1);
  const shock = clamp(T(`${id}.shock`), 0, 1.3);
  const dance = clamp(T(`${id}.dance`), 0, 1);
  const hop = clamp(T(`${id}.hop`), 0, 1);
  const y = laugh * 0.05 * Math.abs(Math.sin(frame * 0.9)) + shock * 0.32 + dance * 0.13 * Math.abs(Math.sin(frame * 0.46)) + hop * 0.16 * Math.abs(Math.sin(frame * 0.38));
  const rx = -laugh * (0.12 + 0.1 * Math.sin(frame * 0.9));
  const ry = dance * 0.45 * Math.sin(frame * 0.23);
  const rz = dance * 0.12 * Math.sin(frame * 0.46) + laugh * 0.05 * Math.sin(frame * 0.45);
  const sy = 1 + shock * 0.14;
  const sxz = 1 - shock * 0.06;
  return { y, rx, ry, rz, sy, sxz };
};

const actorPos = (a: Actor, frame: number): Vec3 => [a.at[0] + track(`${a.id}.dx`, frame), a.at[1], a.at[2] + track(`${a.id}.dz`, frame)];

const ActorView: React.FC<{ a: Actor; frame: number }> = ({ a, frame }) => {
  const T = (n: string) => track(`${a.id}.${n}`, frame);
  const pos = actorPos(a, frame);
  const prev = actorPos(a, Math.max(0, frame - 1));
  const speed = Math.hypot(pos[0] - prev[0], pos[2] - prev[2]) * 30;
  const walk = clamp(speed / 0.9, 0, 1);
  const pop = clamp(track(`${a.id}.pop`, frame, 1), 0, 1.3);
  if (pop <= 0.002) return null;
  const cm = comedyMotion(a.id, frame);
  const s = (a.s ?? 1) * pop;
  const head = HEAD[a.kind];
  const wave = T("wave");
  const sad = T("sad");
  let body: React.ReactNode = null;
  switch (a.kind) {
    case "marcos":
    case "kid":
    case "cunhado":
    case "tonho":
      body = (
        <Marcos
          pose={{
            frame,
            walk,
            wave,
            sad,
            thumb: T("thumb"),
            shirt: a.shirt ?? (a.kind === "cunhado" ? "#8e44ad" : a.kind === "tonho" ? "#c0392b" : undefined),
            hair: a.hair ?? (a.kind === "tonho" ? "#d9d9d9" : a.kind === "cunhado" ? "#2a1a10" : undefined),
            mustache: a.kind === "cunhado" || a.kind === "tonho",
            hat: a.kind === "tonho" ? "straw" : undefined,
          }}
        />
      );
      break;
    case "woman":
    case "vizinha":
      body = <Woman frame={frame} wave={wave} walk={walk} sad={sad} top={a.top} curlers={a.kind === "vizinha"} holdBaby={T("baby") > 0.5} belly={T("belly")} />;
      break;
    case "elder":
    case "sogra":
      body = <Elder frame={frame} wave={wave} walk={walk} sad={sad} dress={a.dress ?? (a.kind === "sogra" ? "#2e7d5b" : undefined)} top={a.top} />;
      break;
    case "lia":
      body = <Lia frame={frame} point={T("point")} wave={clamp(wave * 10, 0, 1)} witch={a.witch ?? THEME.night} gavel={T("gavel") > 0.001 ? T("gavel") : undefined} />;
      break;
    case "ghost":
      body = <Ghost at={[0, 0, 0]} pop={1} frame={frame} />;
      break;
    case "wheel":
      body = <WheelchairPerson frame={frame} roll={T("roll")} wave={wave} />;
      break;
    case "pawn":
      body = <Pawn kind={a.pawnKind ?? "mei"} frame={frame} walk={walk} shrug={T("shrug")} />;
      break;
  }
  return (
    <group position={[pos[0], pos[1] + cm.y, pos[2]]} rotation={[cm.rx, (a.ry ?? 0) + T("ry") + cm.ry, cm.rz]} scale={[s * cm.sxz, s * cm.sy, s * cm.sxz]}>
      {body}
      <Shades at={[0, head.y, head.z]} drop={T("shades")} s={head.s} />
      {T("x") > 0.001 ? <X3D at={[0, head.y + 0.62, 0]} s={T("x") * 1.4} frame={frame} /> : null}
      {T("ok") > 0.001 ? <Check3D at={[0, head.y + 0.62, 0]} s={T("ok") * 1.3} frame={frame} /> : null}
      {T("pumpkin") > 0.001 ? <Pumpkin at={[0, head.y - 0.26 + (1 - clamp(T("pumpkin"), 0, 1)) * 2.4, 0]} s={0.82} frame={frame} seed={0} /> : null}
    </group>
  );
};

/** Documento gigante do INSS num cavalete: carimbo de NEGADO (X vermelho) ou APROVADO (✔ verde). */
export const BigDoc: React.FC<{ at: Vec3; ry: number; pop: number; deny: number; ok: number; frame: number }> = ({ at, ry, pop, deny, ok, frame }) => (
  <G p={at} r={[0, ry, 0]} s={clamp(pop, 0, 1.3)}>
    <Box p={[-0.32, 0.45, -0.08]} r={[0.12, 0, 0]} s={[0.06, 0.95, 0.06]} c={PALETTE.wood} />
    <Box p={[0.32, 0.45, -0.08]} r={[0.12, 0, 0]} s={[0.06, 0.95, 0.06]} c={PALETTE.wood} />
    <Box p={[0, 0.42, -0.28]} r={[-0.35, 0, 0]} s={[0.06, 0.9, 0.06]} c={PALETTE.woodDark} />
    <group position={[0, 1.15, 0]} rotation={[-0.12, 0, 0]}>
      <Box s={[0.95, 1.2, 0.04]} c="#fbfbf6" />
      <Box p={[0, 0.5, 0.025]} s={[0.95, 0.16, 0.01]} c="#1e63c8" cast={false} />
      <Box p={[-0.3, 0.5, 0.032]} s={[0.22, 0.07, 0.006]} c="#ffffff" cast={false} />
      {[0.25, 0.13, 0.01, -0.11, -0.23].map((y, i) => (
        <Box key={i} p={[i === 4 ? -0.15 : 0, y, 0.025]} s={[i === 4 ? 0.5 : 0.78, 0.035, 0.006]} c="#c9ced6" cast={false} />
      ))}
      <Box p={[0.22, -0.43, 0.025]} s={[0.36, 0.02, 0.006]} c="#4a5563" cast={false} />
      {deny > 0.001 ? <X3D at={[0, -0.02, 0.12]} s={2.1 * clamp(deny, 0, 1.3)} frame={0} /> : null}
      {ok > 0.001 ? <Check3D at={[0, -0.02, 0.14]} s={1.9 * clamp(ok, 0, 1.3)} frame={frame * 0} /> : null}
    </group>
  </G>
);

export const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const T = (n: string) => track(n, frame);
  const vis = (id: string) => isVisible(id, frame);
  return (
    <group>
      {THEME.night ? <HalloweenDecor frame={frame} /> : null}
      {THEME.farm ? (
        <>
          <CornField at={STAGE.corn} frame={frame} />
          {vis("bunting") ? <Bunting from={STAGE.buntingA} to={STAGE.buntingB} frame={frame} /> : null}
        </>
      ) : null}
      {CAST.filter((a) => vis(a.id)).map((a) => (
        <ActorView key={a.id} a={a} frame={frame} />
      ))}
      <group position={STAGE.coinsAt}>
        <CoinRain amount={T("plazaCoins")} frame={frame} />
      </group>
      {vis("doc") ? <BigDoc at={STAGE.doc} ry={STAGE.docRy} pop={T("doc.pop")} deny={T("doc.deny")} ok={T("doc.ok")} frame={frame} /> : null}
      {vis("bigGavel") ? <BigGavel at={STAGE.gavel} pop={T("gavel.pop")} swing={T("gavel.hit")} /> : null}
      {vis("liaFolder") ? <Folder at={STAGE.folder} pop={T("liaFolder.pop")} /> : null}
      {vis("ghosts")
        ? STAGE.ghosts.map((p, i) => <Ghost key={i} at={p} pop={clamp(T("ghosts.pop") * 1.3 - i * 0.15, 0, 1.2)} frame={frame + i * 17} s={0.9} />)
        : null}
      {vis("cadStage") ? <CadCard at={STAGE.cad} pop={T("cadStage.pop")} frame={frame} /> : null}
      {vis("ball") ? <Ball at={[STAGE.ball[0] + T("ball.x"), 0.16 + Math.abs(Math.sin(T("ball.x") * 3.2)) * 0.5 * clamp(T("ball.bounce"), 0, 1), STAGE.ball[2] + T("ball.z")]} spin={T("ball.x")} /> : null}
      {vis("myth") ? <X3D at={STAGE.myth} s={T("myth.x") * 2.4} frame={frame} /> : null}
      {vis("truth") ? <Check3D at={STAGE.myth} s={T("truth.ok") * 2.2} frame={frame} /> : null}
      {vis("pole") ? <Cyl p={[STAGE.myth[0], STAGE.myth[1] / 2, STAGE.myth[2]]} rt={0.03} h={STAGE.myth[1]} seg={6} c="#5f6b78" /> : null}
    </group>
  );
};
