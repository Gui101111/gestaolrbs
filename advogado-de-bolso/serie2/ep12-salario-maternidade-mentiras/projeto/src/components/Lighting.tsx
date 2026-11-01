import { THEME } from "../layout";
import { LIGHTING, LIGHTING_NIGHT } from "../theme";

const LT = THEME.night
  ? {
      ...LIGHTING,
      ambient: LIGHTING_NIGHT.ambient,
      hemisphere: LIGHTING_NIGHT.hemisphere,
      key: { ...LIGHTING.key, ...LIGHTING_NIGHT.key },
      fill: { ...LIGHTING.fill, ...LIGHTING_NIGHT.fill },
      rim: { ...LIGHTING.rim, ...LIGHTING_NIGHT.rim },
    }
  : LIGHTING;

// Iluminação central do diorama: céu/chão suave, luz-chave com sombras macias e preenchimento frio.
export const Lighting: React.FC<{ shadowExtent?: number }> = ({ shadowExtent = 10 }) => (
  <>
    <ambientLight intensity={LT.ambient} />
    <hemisphereLight args={[LT.hemisphere.sky, LT.hemisphere.ground, LT.hemisphere.intensity]} />
    <directionalLight
      position={LT.key.position}
      intensity={LT.key.intensity}
      color={LT.key.color}
      castShadow
      shadow-mapSize-width={LT.shadowMapSize}
      shadow-mapSize-height={LT.shadowMapSize}
      shadow-camera-left={-shadowExtent}
      shadow-camera-right={shadowExtent}
      shadow-camera-top={shadowExtent}
      shadow-camera-bottom={-shadowExtent}
      shadow-camera-near={1}
      shadow-camera-far={60}
      shadow-bias={-0.0004}
      shadow-normalBias={0.03}
      shadow-radius={4}
    />
    <directionalLight position={LT.fill.position} intensity={LT.fill.intensity} color={LT.fill.color} />
    <directionalLight position={LT.rim.position} intensity={LT.rim.intensity} color={LT.rim.color} />
  </>
);
