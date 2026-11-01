import { AbsoluteFill, interpolateColors, useCurrentFrame } from "remotion";
import { track } from "../data/scenes";
import { THEME } from "../layout";
import { SKY } from "../theme";
import { clamp } from "../utils/animation";

// Fundo atrás do diorama: céu claro; esquenta para dourado quando o auxílio-acidente aparece.
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const t = clamp(track("pipeAccident.glow", frame) * 0.75, 0, 1);
  const base = THEME.night ? SKY.night : THEME.farm ? SKY.farm : SKY.day;
  const c = base.map((top, i) => interpolateColors(t * (THEME.night ? 0.35 : 1), [0, 1], [top, SKY.warm[i]]));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${c[0]} 0%, ${c[1]} 55%, ${c[2]} 100%)` }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 60% at 50% 48%, rgba(255,255,255,0.10) 0%, rgba(0,0,0,0) 55%, rgba(4,10,22,0.28) 100%)" }} />
    </AbsoluteFill>
  );
};
