/**
 * Projeto + marca + perfil → opções do motor de edição. Usado pelo app
 * (edição no navegador) e pela demonstração.
 */
import type { EditOptions, Ratio, StyleId } from "@/lib/browser-editor/types";

type Row = Record<string, unknown>;

const STYLES: StyleId[] = ["institucional", "dinamico", "cinematografico", "performance", "descontraido"];
const RATIOS: Ratio[] = ["9:16", "1:1", "4:5", "16:9"];

/**
 * Projeto → opções do motor. A edição é sempre a simples (sem perguntas):
 * legenda bonita embaixo, cortes de pausas e vícios e zoom suave nos cortes.
 * O formato segue o vídeo enviado (em pé ou quadrado → 9:16, deitado → 16:9).
 */
export function optionsFor(project: Row, brand: Row | null | undefined, profile: Row | null | undefined): EditOptions {
  const style = (STYLES.includes(project.editing_style as StyleId) ? project.editing_style : "dinamico") as StyleId;
  const picked = ((project.aspect_ratios as string[]) ?? []).filter((r): r is Ratio => RATIOS.includes(r as Ratio));
  const w = Number(project.source_width ?? 0);
  const h = Number(project.source_height ?? 0);
  const ratios: Ratio[] = picked.length ? picked : w > h * 1.1 ? ["16:9"] : ["9:16"];
  const treatment = profile?.treatment === "dra" ? "Dra. " : profile?.treatment === "dr" ? "Dr. " : "";
  const fullName = String(profile?.full_name ?? "").trim();
  const name = String(brand?.professional_name ?? "").trim() || (fullName ? `${/^(dra?\.?)\s/i.test(fullName) ? "" : treatment}${fullName}` : "");
  return {
    style,
    simple: true,
    ratios,
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
