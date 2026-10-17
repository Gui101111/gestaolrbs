import type { Face, Ratio } from "@/lib/browser-editor/types";

export const RATIO_VALUE: Record<Ratio, number> = { "9:16": 9 / 16, "1:1": 1, "4:5": 4 / 5, "16:9": 16 / 9 };

/** Tamanho de saída: lado maior 1920 (até 2 formatos) ou 1280 (3 ou mais, para caber no celular). */
export function outputSize(ratio: Ratio, count: number): { width: number; height: number } {
  const long = count <= 2 ? 1920 : 1280;
  const r = RATIO_VALUE[ratio];
  const even = (n: number) => Math.round(n / 2) * 2;
  return r >= 1 ? { width: long, height: even(long / r) } : { width: even(long * r), height: long };
}

function waitEvent(el: HTMLMediaElement, name: string, ms = 8000) {
  return new Promise<void>((resolve, reject) => {
    const t = window.setTimeout(() => {
      cleanup();
      reject(new Error(`tempo esgotado esperando ${name}`));
    }, ms);
    const ok = () => {
      cleanup();
      resolve();
    };
    const bad = () => {
      cleanup();
      reject(new Error("o navegador não conseguiu ler este vídeo"));
    };
    const cleanup = () => {
      window.clearTimeout(t);
      el.removeEventListener(name, ok);
      el.removeEventListener("error", bad);
    };
    el.addEventListener(name, ok, { once: true });
    el.addEventListener("error", bad, { once: true });
  });
}

export async function seek(video: HTMLVideoElement, t: number) {
  if (Math.abs(video.currentTime - t) < 0.001 && video.readyState >= 2) return;
  const done = waitEvent(video, "seeked");
  video.currentTime = t;
  await done;
}

export async function loadVideo(video: HTMLVideoElement, url: string) {
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  const ready = waitEvent(video, "loadeddata", 20000);
  video.src = url;
  video.load();
  await ready;
}

/** Quadros JPEG pequenos (lado maior 640) em alguns instantes do vídeo. */
export async function grabFrames(video: HTMLVideoElement, times: number[]): Promise<{ blob: Blob; canvas: HTMLCanvasElement }[]> {
  const out: { blob: Blob; canvas: HTMLCanvasElement }[] = [];
  const scale = 640 / Math.max(video.videoWidth, video.videoHeight);
  for (const t of times) {
    await seek(video, t);
    const c = document.createElement("canvas");
    c.width = Math.round(video.videoWidth * scale);
    c.height = Math.round(video.videoHeight * scale);
    c.getContext("2d")!.drawImage(video, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.82));
    if (blob) out.push({ blob, canvas: c });
  }
  return out;
}

type DetectorCtor = new (o?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
  detect(src: CanvasImageSource): Promise<{ boundingBox: DOMRectReadOnly }[]>;
};

/** Detector de rosto do próprio navegador (Chrome no Android e no Mac). */
export async function faceWithDetector(frames: HTMLCanvasElement[]): Promise<Face | null> {
  const Ctor = (window as unknown as { FaceDetector?: DetectorCtor }).FaceDetector;
  if (!Ctor) return null;
  try {
    const det = new Ctor({ fastMode: true, maxDetectedFaces: 3 });
    const pts: { x: number; y: number; area: number }[] = [];
    for (const c of frames) {
      const faces = await det.detect(c);
      const big = faces.sort((a, b) => b.boundingBox.width * b.boundingBox.height - a.boundingBox.width * a.boundingBox.height)[0];
      if (big) {
        const b = big.boundingBox;
        pts.push({ x: (b.x + b.width / 2) / c.width, y: (b.y + b.height / 2) / c.height, area: b.width * b.height });
      }
    }
    if (!pts.length) return null;
    return { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length, by: "detector" };
  } catch {
    return null;
  }
}

/**
 * Recorte da fonte para o formato de saída, com o rosto no terço de cima
 * (vertical) ou centralizado (horizontal), e zoom opcional.
 */
export function cropFor(srcW: number, srcH: number, ratio: Ratio, face: { x: number; y: number }, zoom = 1) {
  const target = RATIO_VALUE[ratio];
  let sw: number;
  let sh: number;
  if (srcW / srcH > target) {
    sh = srcH;
    sw = srcH * target;
  } else {
    sw = srcW;
    sh = srcW / target;
  }
  sw /= zoom;
  sh /= zoom;
  const fx = face.x * srcW;
  const fy = face.y * srcH;
  // rosto a ~38% da altura do quadro quando sobra altura; centralizado quando sobra largura
  const sx = Math.min(srcW - sw, Math.max(0, fx - sw / 2));
  const anchorY = sh < srcH * 0.98 || zoom > 1 ? 0.4 : 0.5;
  const sy = Math.min(srcH - sh, Math.max(0, fy - sh * anchorY));
  return { sx, sy, sw, sh };
}
