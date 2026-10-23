import type { Project, ProjectSettings, User } from './types';

export const ACCENTS = [
  { id: '#FFD43B', name: 'Amarelo' },
  { id: '#5CF0A6', name: 'Verde' },
  { id: '#5CC8FF', name: 'Azul' },
  { id: '#FF6BB5', name: 'Rosa' },
  { id: '#FF8A3D', name: 'Laranja' },
  { id: '#FFFFFF', name: 'Branco' },
];

export function defaultSettings(): ProjectSettings {
  return {
    format: '9:16',
    fit: 'cover',
    language: 'pt',
    captions: {
      enabled: true,
      style: 'recomendada',
      position: 'bottom',
      size: 'md',
      color: '#FFD43B',
      uppercase: false,
    },
    vinheta: {
      intro: false,
      outro: false,
      style: 'escura',
      color: '#FFD43B',
      title: '',
      subtitle: '',
      outroTitle: 'Obrigado por assistir',
      outroSubtitle: '',
      sound: true,
      hasLogo: false,
    },
    ai: {
      removeSilences: true,
      removeFillers: true,
      pace: 'equilibrado',
      zooms: true,
      highlightKeywords: true,
      hookTitle: false,
    },
    prompt: '',
  };
}

/** Mescla configurações salvas com os padrões (útil quando surgem campos novos). */
export function withDefaults(saved: Partial<ProjectSettings> | null | undefined): ProjectSettings {
  const d = defaultSettings();
  if (!saved) return d;
  return {
    ...d,
    ...saved,
    captions: { ...d.captions, ...saved.captions },
    vinheta: { ...d.vinheta, ...saved.vinheta },
    ai: { ...d.ai, ...saved.ai },
  };
}

/** Título sugerido a partir do nome do arquivo ("minha_dica-01.mp4" → "minha dica 01"). */
export function titleFromFile(name: string) {
  return name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Novo vídeo';
}

export function newProject(user: User, settings: ProjectSettings, file: File): Project {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    userId: user.id,
    title: titleFromFile(file.name),
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    settings,
    sourceName: file.name,
    sourceSize: file.size,
    sourceDuration: null,
    outputDuration: null,
    outputExt: null,
    transcript: null,
    plan: null,
    report: null,
    thumbnail: null,
    error: null,
  };
}
