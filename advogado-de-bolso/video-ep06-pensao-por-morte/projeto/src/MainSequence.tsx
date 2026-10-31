import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Soundtrack } from "./audio/Soundtrack";
import { AnimatedCaptions } from "./components/AnimatedCaptions";
import { Background } from "./components/Background";
import { CameraController } from "./components/CameraController";
import { Lighting } from "./components/Lighting";
import { BigWords, EndCard, Flash, ShareIcon, SpeedLines, WhipStreaks, XRay } from "./components/FX";
import { Overlays, RewindOverlay } from "./components/Overlays";
import { BadgeLayer } from "./components/TechnicalBadge";
import { World } from "./components/World";
import { scenes, track } from "./data/scenes";
import { CAMERA } from "./theme";
import { clamp } from "./utils/animation";

// Orquestra o vídeo a partir do array tipado de cenas (src/data/scenes.ts):
// um único canvas 3D com o diorama persistente e, por cima, rótulos, badges, legendas e áudio.

const FadeOut: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = track("fade", frame);
  if (fade <= 0.001) return null;
  return <AbsoluteFill style={{ background: "#071634", opacity: fade }} />;
};

export const MainSequence: React.FC = () => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const rewind = clamp(track("rewind", frame), 0, 1);
  const whipV = clamp(track("whip", frame), 0, 1);
  const blur = 2.5 * rewind + 7 * whipV;
  const gray = clamp(track("mood.gray", frame), 0, 1);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0e2036" }}>
      <Background />
      <AbsoluteFill style={{ filter: blur > 0.05 || gray > 0.01 ? `grayscale(${Math.max(0.85 * rewind, 0.75 * gray)}) blur(${blur}px) contrast(${1 + 0.15 * rewind})` : undefined }}>
        <ThreeCanvas width={width} height={height} gl={{ antialias: true }} shadows="percentage" flat camera={{ fov: CAMERA.fov, near: CAMERA.near, far: CAMERA.far, position: [8, 6, 30] }}>
          <CameraController />
          <Lighting shadowExtent={11} />
          <World />
        </ThreeCanvas>
      </AbsoluteFill>
      <Overlays />
      <SpeedLines />
      <WhipStreaks />
      <RewindOverlay />
      <XRay />
      {scenes.map((sc) => (
        <Sequence key={sc.id} name={sc.id} from={sc.startFrame} durationInFrames={sc.durationInFrames}>
          <BadgeLayer badges={sc.badges} />
        </Sequence>
      ))}
      <BigWords />
      <ShareIcon />
      <AnimatedCaptions />
      <Flash />
      <EndCard />
      <FadeOut />
      <Soundtrack />
    </AbsoluteFill>
  );
};
