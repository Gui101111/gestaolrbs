import { AbsoluteFill, useCurrentFrame } from "remotion";
import { isVisible, sceneAt, track } from "../data/scenes";
import { L, PIPES } from "../layout";
import { FONT, PALETTE } from "../theme";
import { clamp, type Vec3 } from "../utils/animation";
import { cameraPoseAt, projectPoint } from "./CameraController";
import { PHONE_AT } from "./World";
import { WorldLabel } from "./WorldLabel";

// Camada 2D ancorada no 3D: rótulos do sistema, número 135 na tela do celular e vinheta de "problema".

const stagger = (v: number, i: number) => clamp(v * 1.7 - i * 0.22, 0, 1);

export const Overlays: React.FC = () => {
  const frame = useCurrentFrame();
  const pose = cameraPoseAt(frame);
  const T = (n: string) => track(n, frame);
  const id = sceneAt(frame).id;
  const labels: { p: Vec3; text: string; a: number; off: [number, number]; accent?: string }[] = [];

  const sys = T("labels.system");
  if (sys > 0.001) {
    labels.push({ p: [L.warehouse[0], 4.0, L.warehouse[2]], text: "EMPRESA", a: stagger(sys, 0), off: [0, -70] });
    labels.push({ p: [L.inss[0], 4.0, L.inss[2]], text: "INSS", a: stagger(sys, 1), off: [0, -70], accent: PALETTE.info });
    labels.push({ p: [L.piggy[0] + 0.6, 1.6, L.piggy[2] + 0.6], text: "COFRINHO", a: stagger(sys, 2), off: [120, 90], accent: "#f48fb1" });
    labels.push({ p: PIPES.salary[2], text: "SALÁRIO", a: stagger(sys, 3), off: [-150, -80], accent: "#bcd3ea" });
  }
  if (id === "scene-07-dedos-nao-dobram") {
    const a = clamp(T("capacity.pop"), 0, 1);
    if (a > 0.01) labels.push({ p: [L.work[0] + 0.5, 2.18, L.work[2]], text: "CAPACIDADE", a, off: [150, 60], accent: "#ff8a1f" });
  }
  if (id === "scene-13-valor-ate-aposentar") {
    const a = clamp(T("timeline.stop"), 0, 1);
    if (a > 0.01) labels.push({ p: [L.chair[0], 1.3, L.chair[2]], text: "APOSENTADORIA", a, off: [60, -110], accent: PALETTE.red });
  }
  const fin = T("final.labels");
  if (fin > 0.001) {
    labels.push({ p: PIPES.salary[2], text: "SALÁRIO", a: stagger(fin, 0), off: [-120, -90], accent: "#bcd3ea" });
    labels.push({ p: PIPES.accident[2], text: "AUXÍLIO-ACIDENTE", a: stagger(fin, 1), off: [80, -150], accent: PALETTE.coinGold });
    labels.push({ p: [L.inss[0], 4.0, L.inss[2]], text: "INSS", a: stagger(fin, 2), off: [0, -70], accent: PALETTE.info });
    labels.push({ p: [L.piggy[0] + 0.6, 1.6, L.piggy[2] + 0.6], text: "COFRINHO", a: stagger(fin, 3), off: [110, 90], accent: "#f48fb1" });
  }

  // "135" na tela do celular
  let phone: React.ReactNode = null;
  if (isVisible("phone", frame)) {
    const a = clamp(T("phone.pop"), 0, 1);
    if (a > 0.05) {
      const pt = projectPoint(pose, PHONE_AT);
      phone = (
        <div
          style={{
            position: "absolute",
            left: pt.x,
            top: pt.y,
            translate: "-50% -50%",
            scale: String(0.6 + 0.4 * a),
            opacity: a,
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 74,
            color: "#ffffff",
            padding: "6px 22px",
            borderRadius: 22,
            background: "rgba(13, 44, 110, 0.92)",
            border: `4px solid ${PALETTE.warning}`,
            boxShadow: "0 10px 26px rgba(0,0,0,0.4)",
            letterSpacing: 2,
          }}
        >
          135
        </div>
      );
    }
  }

  const vignette = clamp(T("vignette.red"), 0, 1);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {vignette > 0.01 ? (
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 60% at 50% 48%, rgba(229,56,59,0) 45%, rgba(200,30,40,${0.6 * vignette}) 100%)` }} />
      ) : null}
      {labels.map((l, i) => (
        <WorldLabel key={i} pose={pose} point={l.p} text={l.text} appear={l.a} offset={l.off} accent={l.accent} size={36} />
      ))}
      {phone}
    </AbsoluteFill>
  );
};

/** Efeito de "rebobinar" entre as cenas 1 e 2: faixas e duas setas para trás. */
export const RewindOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const r = clamp(track("rewind", frame), 0, 1);
  if (r < 0.01) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: `repeating-linear-gradient(0deg, rgba(255,255,255,${0.1 * r}) 0px, rgba(255,255,255,${0.1 * r}) 3px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 14px)`, transform: `translateY(${(frame * 9) % 14}px)` }} />
      <div style={{ position: "absolute", left: "50%", top: 820, translate: "-50% 0", display: "flex", gap: 6, opacity: r }}>
        {[0, 1].map((i) => (
          <div key={i} style={{ width: 0, height: 0, borderTop: "70px solid transparent", borderBottom: "70px solid transparent", borderRight: "100px solid rgba(255,255,255,0.92)", filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.4))" }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
