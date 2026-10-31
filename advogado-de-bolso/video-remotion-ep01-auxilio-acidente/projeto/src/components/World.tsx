import { useCurrentFrame } from "remotion";
import { isVisible, track } from "../data/scenes";
import { L, PIPES, POCKET_WORK, VALVES } from "../layout";
import { PALETTE } from "../theme";
import { clamp, type Vec3 } from "../utils/animation";
import { Inss, Warehouse } from "./Buildings";
import { Lia, Marcos, Pawn, type PawnKind } from "./Characters";
import { Island } from "./Island";
import { Piggy } from "./Piggy";
import { Pipe } from "./Pipes";
import { Box, v3 } from "./prims";
import {
  Bench,
  BigCoin,
  BoxPile,
  Calendar,
  CoinRain,
  CapacityGauge,
  CastShards,
  Check3D,
  DizzyStars,
  Folder,
  Gate,
  Hourglass,
  LawBook,
  MiniField,
  MiniHouse,
  MiniRoad,
  Padlock,
  Phone,
  ShelfAndLadder,
  Siren,
  SlipBox,
  Stamp,
  Timeline,
  WorkBooklet,
} from "./Props";

// O cenário persistente: o MESMO diorama do começo ao fim. Cada objeto lê seu estado das trilhas
// (track) no frame GLOBAL, então nada "pula" de lugar entre cortes — só a câmera se move.

const LADDER_FRONT: Vec3 = [L.ladderBase[0], 0, L.ladderBase[2] + 0.2];
const VALVE_STAND: Vec3 = [VALVES.accident[0], VALVES.accident[1] + 0.12, VALVES.accident[2] + 0.42];
const PADLOCK_AT: Vec3 = [VALVES.accident[0], VALVES.accident[1] + 0.2, VALVES.accident[2] + 0.17];
const FOLDER_START: Vec3 = [POCKET_WORK[0] + 0.3, POCKET_WORK[1] - 0.12, POCKET_WORK[2] + 0.25];
const FOLDER_END: Vec3 = [L.gate[0], 1.0, L.gate[2] - 0.45];
export const PHONE_AT: Vec3 = [L.work[0] - 0.36, 1.72, L.work[2] + 0.22];

/** Posição do Marcos no frame (função pura, usada também para estimar se ele está andando). */
const marcosPos = (frame: number) => {
  const T = (n: string) => track(n, frame);
  const stand = v3.lerp(L.home, L.work, clamp(T("marcos.spot"), 0, 1));
  const climbH = T("marcos.climb");
  const climbW = clamp(climbH / 0.3, 0, 1);
  let pos = v3.lerp(stand, LADDER_FRONT, climbW);
  pos = [pos[0], pos[1] + climbH, pos[2]];
  const fall = T("marcos.fall");
  if (fall > 0.001) pos = v3.arc([LADDER_FRONT[0], 1.2, LADDER_FRONT[2]], L.landing, clamp(fall, 0, 1), 0.45);
  const recover = T("marcos.recover");
  if (recover > 0.001) pos = v3.lerp(fall > 0.001 ? L.landing : pos, stand, clamp(recover, 0, 1));
  return { pos, climbW, fall, recover };
};

const PAWNS: PawnKind[] = ["carteira", "domestica", "portuario", "rural", "mei"];

export const World: React.FC = () => {
  const frame = useCurrentFrame();
  const T = (n: string) => track(n, frame);
  const vis = (id: string) => isVisible(id, frame);

  // ------------------------------------------------ Marcos
  const m = marcosPos(frame);
  const prev = marcosPos(Math.max(0, frame - 1));
  const speed = Math.hypot(m.pos[0] - prev.pos[0], m.pos[2] - prev.pos[2]) * 30;
  const onLadder = m.climbW > 0.01 && m.fall < 0.001;
  const walk = onLadder ? 0 : clamp(speed / 0.9, 0, 1);
  const sitW = Math.max(T("marcos.sit"), m.fall > 0.85 ? 1 - clamp(m.recover * 1.6, 0, 1) : 0);
  const rotY = onLadder ? Math.PI * m.climbW : 0;
  const tumble = m.fall > 0.001 && m.fall < 1 ? -Math.sin(m.fall * Math.PI) * 0.7 : 0;
  const shake = 0;
  const thumbA = T("marcos.thumb");
  const hopY = clamp(T("marcos.hop"), 0, 1) * Math.abs(Math.sin(frame * 0.38)) * 0.16;
  const sad = Math.max(T("box.slip") * (1 - T("stiff.tone")), T("salaryValve.closed") * (1 - thumbA));
  const pose = {
    frame,
    walk,
    carry: clamp(T("marcos.carry") * 20, 0, 1),
    sit: sitW,
    scratch: T("marcos.scratch"),
    thumb: thumbA,
    squint: T("marcos.squint"),
    cast: T("cast.on"),
    reach: T("marcos.reach"),
    handClose: T("hand.close"),
    stiffGlow: T("stiff.glow"),
    stiffTone: T("stiff.tone"),
    climb: onLadder ? 1 : 0,
    flail: m.fall > 0.02 && m.fall < 0.92 ? 1 : 0,
    work: clamp(T("marcos.work") * 8, 0, 1),
    wave: T("marcos.wave"),
    sad,
  };

  // ------------------------------------------------ Lia
  const liaPop = T("lia.pop");
  const liaClimb = clamp(T("lia.climb"), 0, 1);
  const pocketFeet: Vec3 = v3.add(m.pos, v3.rotY([0.12, 1.365 - 0.25 + clamp(liaPop, 0, 1.2) * 0.15 - 0.36 * sitW, 0.185], rotY));
  const liaPos = liaClimb > 0.001 ? v3.arc(pocketFeet, VALVE_STAND, liaClimb, 1.4) : pocketFeet;
  const swingDeg = T("gavel.swing");
  const showGavel = vis("gavel") && liaClimb > 0.6;

  // ------------------------------------------------ fila do portão
  const gz = L.gate[2];
  const arrive = T("queue.arrive");
  const pawnScale = clamp(arrive * 3, 0, 1) * (1 - T("pawns.shrink"));
  let gateOpen = 0;
  let passing = false;
  const pawns = PAWNS.map((kind, i) => {
    const q: Vec3 = [3.45 + i * 0.62 + 1.8 * (1 - clamp(arrive, 0, 1)), 0, gz];
    let p = q;
    let ry = -Math.PI / 2;
    let w = arrive > 0.01 && arrive < 0.99 ? 1 : 0;
    let shrug = 0;
    if (kind !== "mei") {
      const t = clamp(T(`pawn${i + 1}.pass`), 0, 1);
      const gate: Vec3 = [L.gate[0], 0, gz];
      const end: Vec3 = [1.95 - i * 0.42, 0, gz - 0.2];
      p = t < 0.5 ? v3.lerp(q, gate, t * 2) : v3.lerp(gate, end, (t - 0.5) * 2);
      if (t > 0.01 && t < 0.99) w = 1;
      if (t >= 0.99) ry = 0;
      const bump = clamp(1 - Math.abs(t - 0.5) * 3, 0, 1);
      gateOpen = Math.max(gateOpen, bump);
      if (bump > 0.3) passing = true;
    } else {
      const t = clamp(T("pawn5.try"), 0, 1);
      p = v3.lerp(q, [L.gate[0] + 0.5, 0, gz], t);
      if (t > 0.01 && t < 0.99) w = 1;
      shrug = T("pawn5.shrug");
      if (shrug > 0.3) ry = -Math.PI / 4;
    }
    return { kind, p, ry, w, shrug };
  });
  const gateLight = T("gate.red") > 0.5 ? PALETTE.red : passing ? PALETTE.green : "#9aa3ad";

  // ------------------------------------------------ pasta / carimbo de negado
  const folderFly = clamp(T("folder.fly"), 0, 1);
  const folderBack = clamp(T("folder.back"), 0, 1);
  const folderAt = v3.lerp(v3.arc(FOLDER_START, FOLDER_END, folderFly, 1.6), FOLDER_START, folderBack);
  const deny = T("denyStamp.drop");

  const side = 1 - T("side.shrink");
  const riderSit = T("rider.sit");
  const tipDeg = T("moto.tip");

  return (
    <group>
      <Island />
      <Warehouse />
      <Inss glow={T("inss.glow")} review={T("inss.review")} />
      <ShelfAndLadder wobble={T("ladder.wobble")} slide={T("ladder.slide")} frame={frame} />
      <CoinRain amount={T("coinRain")} frame={frame} />
      <BoxPile />
      {vis("bench") ? <Bench /> : null}
      <Piggy level={T("piggy.level")} split={T("piggy.split")} frame={frame} />

      {/* canos */}
      <Pipe points={PIPES.salary} grow={1} flow={T("coins.salary.flow")} tint="#bcd3ea" coin={PALETTE.silver} frame={frame} valveAt={VALVES.salary} closed={T("salaryValve.closed")} />
      {vis("sickPipe") ? <Pipe points={PIPES.sick} grow={T("pipeSick.grow")} flow={T("coins.sick.flow")} tint={PALETTE.sickBlue} coin="#7cc4ff" frame={frame} seed={0.3} /> : null}
      {vis("accidentPipe") ? (
        <Pipe
          points={PIPES.accident}
          grow={T("pipeAccident.grow")}
          flow={T("coins.accident.flow")}
          tint="#ffd25e"
          coin={PALETTE.coinGold}
          frame={frame}
          glow={T("pipeAccident.glow")}
          valveAt={VALVES.accident}
          closed={T("accidentValve.closed")}
          seed={0.6}
        />
      ) : null}

      {/* Marcos e Lia */}
      <group position={[m.pos[0], m.pos[1] + hopY, m.pos[2]]} rotation={[tumble, rotY, 0]}>
        <Marcos pose={pose} />
      </group>
      <DizzyStars at={v3.add(m.pos, [0, 1.98 - 0.36 * sitW, 0])} amount={T("dizzy.stars")} frame={frame} />
      {liaPop > 0.01 || liaClimb > 0.001 ? (
        <group position={liaPos} rotation={[0, liaClimb > 0.5 ? Math.PI : rotY, 0]}>
          <Lia point={T("lia.point")} wave={clamp(T("lia.wave") * 10, 0, 1)} frame={frame} gavel={showGavel ? 1.2 * (1 - clamp(-swingDeg / 90, 0, 1)) : undefined} />
        </group>
      ) : null}

      {/* cena 1–2 */}
      {vis("siren") ? <Siren drop={T("siren.drop")} flash={T("siren.flash")} squashed={T("lawBook.drop") >= 0.5} frame={frame} /> : null}
      {vis("lawBook") ? <LawBook drop={T("lawBook.drop")} /> : null}
      {vis("workBooklet") ? <WorkBooklet pop={T("workBooklet.pop")} frame={frame} /> : null}
      {/* cena 5–6 */}
      {vis("hourglass") ? <Hourglass pop={T("hourglass.pop")} frame={frame} /> : null}
      {vis("pericia") && (T("pericia.drop") > 0.001 || T("pericia.mark") > 0.5) ? <Stamp drop={T("pericia.drop")} marked={T("pericia.mark") > 0.5} color={PALETTE.info} at={[L.work[0] + 0.05, 2.2, L.work[2] + 0.5]} /> : null}
      {vis("stamp") && T("marcos.sit") > 0.5 ? <Stamp drop={T("stamp.drop")} marked={T("cast.shatter") > 0.01} color={PALETTE.green} at={[L.home[0], 2.05, L.home[2] + 0.35]} /> : null}
      <CastShards at={[L.home[0] + 0.05, 0.85, L.home[2] + 0.3]} t={T("cast.shatter")} />
      {/* cena 7–9 */}
      {vis("capacityGauge") ? <CapacityGauge pop={T("capacity.pop")} level={T("capacity.level")} /> : null}
      {vis("box") ? <SlipBox grip={T("box.grip")} slip={T("box.slip")} bounce={T("box.bounce")} /> : null}
      {vis("calendar") ? <Calendar pop={T("calendar.pop")} flip={T("calendar.flip")} /> : null}
      {/* cena 10–11: mini-cenários */}
      {vis("road") ? (
        <MiniRoad pop={T("road.pop") * side} tipDeg={tipDeg} frame={frame}>
          {riderSit < 0.02 ? (
            <group position={[0, 0.04, 0.1]} rotation={[(-tipDeg * Math.PI) / 180, 0, 0]}>
              <group position={[-0.08, 0.2, 0]} rotation={[0, Math.PI / 2, 0]}>
                <Marcos pose={{ frame, helmet: true, sit: 0.85 }} />
              </group>
            </group>
          ) : (
            <group>
              <Box p={[0.15, 0.2, 0.85]} s={[0.55, 0.4, 0.35]} c="#9aa3ad" />
              <group position={[0.15, 0, 0.85]} scale={clamp(riderSit, 0, 1)}>
                <Marcos pose={{ frame, helmet: true, sit: 1, sad: 1 }} />
              </group>
              <DizzyStars at={[0.15, 1.65, 0.85]} amount={clamp(riderSit, 0, 1)} frame={frame} />
            </group>
          )}
        </MiniRoad>
      ) : null}
      {vis("house") ? <MiniHouse pop={T("house.pop") * side} /> : null}
      {vis("field") ? <MiniField pop={T("field.pop") * side} frame={frame} /> : null}
      {vis("checks")
        ? [v3.add(L.road, [0, 1.6, 0]), v3.add(L.house, [0, 1.75, 0]), v3.add(L.field, [0, 1.1, 0])].map((p, i) => (
            <Check3D key={i} at={p} s={clamp(T("checks.pop") * 1.4 - i * 0.2, 0, 1.2) * side} frame={frame} />
          ))
        : null}
      {/* cena 11–13: portão e fila */}
      {vis("gate") ? <Gate pop={T("gate.pop")} open={gateOpen} block={T("gate.block")} light={gateLight} frame={frame} /> : null}
      {vis("pawns") && pawnScale > 0.01
        ? pawns.map((pw, i) => (
            <group key={i} position={pw.p} rotation={[0, pw.ry, 0]} scale={pawnScale}>
              <Pawn kind={pw.kind} frame={frame} walk={pw.w} shrug={pw.shrug} />
            </group>
          ))
        : null}
      {/* cena 13+ */}
      {vis("bigCoin") ? <BigCoin pop={T("bigCoin.pop")} spinDeg={T("bigCoin.spin")} split={T("bigCoin.split")} drop={T("halfCoin.drop")} /> : null}
      {vis("timeline") ? <Timeline grow={T("timeline.grow")} coins={T("timeline.coins")} chair={T("chair.pop")} stop={T("timeline.stop")} frame={frame} /> : null}
      {/* cena 14–15 */}
      {vis("padlock") ? <Padlock at={PADLOCK_AT} drop={T("padlock.drop")} brk={T("padlock.break")} /> : null}
      {vis("folder") ? (
        <group>
          <Folder at={folderAt} pop={T("folder.pop")} />
          {vis("denyStamp") && deny > 0.001 ? (
            <group position={[folderAt[0], folderAt[1], folderAt[2] + 0.05 + (1 - clamp(deny, 0, 1.15)) * 1.2]}>
              <group rotation={[Math.PI / 2, 0, 0]}>
                <Box p={[0, -0.05, 0]} s={[0.3, 0.1, 0.2]} c="#5b3b25" />
                <Box p={[0, -0.11, 0]} s={[0.27, 0.03, 0.17]} c={PALETTE.red} />
                <Box p={[0, 0.2, 0]} s={[0.08, 0.4, 0.08]} c={PALETTE.wood} />
              </group>
            </group>
          ) : null}
          {vis("denyStamp") && deny > 0.85 ? (
            <group position={[folderAt[0], folderAt[1], folderAt[2] + 0.04]} rotation={[0, -0.3, 0.1]}>
              <Box r={[0, 0, 0.7]} s={[0.3, 0.05, 0.01]} c={PALETTE.red} emissive={PALETTE.red} ei={0.4} cast={false} />
              <Box r={[0, 0, -0.7]} s={[0.3, 0.05, 0.01]} c={PALETTE.red} emissive={PALETTE.red} ei={0.4} cast={false} />
            </group>
          ) : null}
        </group>
      ) : null}
      {vis("phone") ? <Phone at={PHONE_AT} pop={T("phone.pop")} ring={T("phone.ring")} frame={frame} /> : null}
      {shake ? null : null}
    </group>
  );
};
