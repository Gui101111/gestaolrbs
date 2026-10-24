/**
 * Caminhos das entregas no bucket rendered-videos:
 *   <user_id>/<project_id>/v<n>/<9x16>.mp4 · <9x16>.jpg · report.json · plano.json · transcricao.json
 */
export const ratioKey = (ratio: string) => ratio.replace(":", "x");

export function versionPrefix(userId: string, projectId: string, version: number) {
  return `${userId}/${projectId}/v${version}`;
}

export type OutputPaths = {
  prefix: string;
  report: string;
  plano: string;
  transcricao: string;
  formats: Record<string, { video: string; thumb: string }>;
};

export function outputPaths(userId: string, projectId: string, version: number, ratios: readonly string[]): OutputPaths {
  const prefix = versionPrefix(userId, projectId, version);
  return {
    prefix,
    report: `${prefix}/report.json`,
    plano: `${prefix}/plano.json`,
    transcricao: `${prefix}/transcricao.json`,
    formats: Object.fromEntries(ratios.map((r) => [r, { video: `${prefix}/${ratioKey(r)}.mp4`, thumb: `${prefix}/${ratioKey(r)}.jpg` }])),
  };
}

/** Nome do arquivo que o agente grava em /mnt/session/outputs para cada caminho. */
export function outputFileName(path: string) {
  return path.slice(path.lastIndexOf("/") + 1);
}
