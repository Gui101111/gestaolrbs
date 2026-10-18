/**
 * Projeto + marca + perfil → opções do motor de edição (as mesmas perguntas
 * do Novo vídeo). Usado pelo app (edição no navegador) e pela demonstração.
 */
import { defaultsFor, usableAccent } from "@/lib/browser-editor/looks";
import type { CaptionStyle, EditOptions, Interval, Ratio, StyleId } from "@/lib/browser-editor/types";

type Row = Record<string, unknown>;

const STYLES: StyleId[] = ["institucional", "dinamico", "cinematografico", "performance", "descontraido"];
const RATIOS: Ratio[] = ["9:16", "1:1", "4:5", "16:9"];

function parseTime(v: string): number | null {
  const parts = v.trim().split(":").map(Number);
  if (!parts.length || parts.some((n) => !Number.isFinite(n))) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

function ctaFor(type: string | undefined, text: string | undefined, brand: Row | null | undefined) {
  if (text?.trim()) return text.trim();
  const ig = String(brand?.instagram ?? "").trim();
  const site = String(brand?.website ?? "").trim();
  const zap = String(brand?.whatsapp ?? "").trim();
  if (type === "seguir" && ig) return `Siga ${ig.startsWith("@") ? ig : `@${ig}`}`;
  if (type === "site" && site) return `Acesse ${site.replace(/^https?:\/\//, "")}`;
  if (type === "whatsapp" && zap) return `WhatsApp ${zap}`;
  return "";
}

/** Projeto + marca + perfil → opções do motor (as mesmas perguntas do Novo vídeo). */
export function optionsFor(project: Row, brand: Row | null | undefined, profile: Row | null | undefined, logo: Blob | null): EditOptions {
  const o = (project.options ?? {}) as {
    answers?: Record<string, string>;
    answers_text?: Record<string, string>;
    caption_style?: CaptionStyle;
    cta_type?: string;
    cta_text?: string;
    hook_text?: string;
    cut_ranges?: { start: string; end: string }[];
    music_tone?: string;
  };
  const style = (STYLES.includes(project.editing_style as StyleId) ? project.editing_style : "institucional") as StyleId;
  const base = defaultsFor(style);
  const a = o.answers ?? {};
  const yes = (k: string, fallback: boolean) => (a[k] ? a[k] !== "nao" : fallback);
  const ratios = ((project.aspect_ratios as string[]) ?? []).filter((r): r is Ratio => RATIOS.includes(r as Ratio));
  const treatment = profile?.treatment === "dra" ? "Dra. " : profile?.treatment === "dr" ? "Dr. " : "";
  const fullName = String(profile?.full_name ?? "").trim();
  const name = String(brand?.professional_name ?? "").trim() || (fullName ? `${/^(dra?\.?)\s/i.test(fullName) ? "" : treatment}${fullName}` : "");
  const office = String(brand?.office_name ?? profile?.office_name ?? "").trim();
  const useBrand = yes("brand", true);
  const primary = String(brand?.primary_color ?? "");
  const accentColor = useBrand && primary.toUpperCase() !== "#C6A15B" ? usableAccent(primary) : null;
  const moods = ["sobria", "inspiradora", "neutra", "energica", "leve"] as const;
  const musicMood = moods.find((m) => m === o.music_tone) ?? "auto";
  const notes = [String(project.instructions ?? ""), ...Object.entries(o.answers_text ?? {}).map(([k, v]) => `${k}: ${v}`)].filter((s) => s.trim()).join(" · ");
  return {
    style,
    ratios: ratios.length ? ratios : ["9:16"],
    cutPauses: yes("pauses", base.cutPauses),
    removeMistakes: yes("pauses", base.removeMistakes),
    captions: yes("captions", base.captions),
    captionStyle: o.caption_style ?? base.captionStyle,
    lowerThird: false,
    name,
    office,
    oab: "",
    hook: yes("hook", base.hook),
    hookText: o.hook_text ?? "",
    cta: yes("cta", base.cta),
    ctaText: ctaFor(o.cta_type, o.cta_text, brand),
    vignette: yes("vignette", base.vignette) && Boolean(name),
    zoom: yes("effects", base.zoom),
    effects: yes("effects", base.effects),
    music: yes("music", base.music),
    musicMood,
    accentColor,
    enhanceAudio: true,
    oabReview: false,
    logo: useBrand ? logo : null,
    script: "",
    framing: {},
    extraCuts: (o.cut_ranges ?? [])
      .map((r) => ({ start: parseTime(r.start), end: parseTime(r.end) }))
      .filter((r): r is Interval => r.start !== null && r.end !== null && r.end > r.start),
    notes,
    targetSeconds: null,
  };
}
