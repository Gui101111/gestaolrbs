/**
 * Projeto + marca + perfil → opções do motor de edição. Usado pelo app
 * (edição no navegador) e pela demonstração.
 */
import type { EditOptions, StyleId } from "@/lib/browser-editor/types";

type Row = Record<string, unknown>;

const STYLES: StyleId[] = ["institucional", "dinamico", "cinematografico", "performance", "descontraido"];

/**
 * Projeto → opções do motor. A edição é sempre a simples (sem perguntas):
 * legenda bonita embaixo, cortes de pausas e vícios e zoom suave nos cortes.
 * Sempre 9:16 (Reels ou TikTok); vídeo deitado é reenquadrado no rosto.
 */
export function optionsFor(project: Row, brand: Row | null | undefined, profile: Row | null | undefined): EditOptions {
  const style = (STYLES.includes(project.editing_style as StyleId) ? project.editing_style : "dinamico") as StyleId;
  // só dois destinos, os dois verticais: Reels (Instagram) ou TikTok
  const platforms = ((project.platforms as string[]) ?? []).map((p) => String(p).toLowerCase());
  const platform = platforms.some((p) => p.includes("tiktok")) ? "tiktok" : "reels";
  const treatment = profile?.treatment === "dra" ? "Dra. " : profile?.treatment === "dr" ? "Dr. " : "";
  const fullName = String(profile?.full_name ?? "").trim();
  const name = String(brand?.professional_name ?? "").trim() || (fullName ? `${/^(dra?\.?)\s/i.test(fullName) ? "" : treatment}${fullName}` : "");
  return {
    style,
    simple: true,
    platform,
    ratios: ["9:16"],
    cutPauses: true,
    removeMistakes: true,
    captions: true,
    captionStyle: "palavra",
    lowerThird: false,
    name,
    office: String(brand?.office_name ?? profile?.office_name ?? "").trim(),
    oab: "",
    hook: false,
    hookText: "",
    cta: false,
    ctaText: "",
    vignette: false,
    zoom: true,
    effects: false,
    music: false,
    musicMood: "auto",
    accentColor: null,
    enhanceAudio: true,
    oabReview: false,
    logo: null,
    script: "",
    framing: {},
    extraCuts: [],
    notes: String(project.instructions ?? "").trim(),
    targetSeconds: null,
  };
}
