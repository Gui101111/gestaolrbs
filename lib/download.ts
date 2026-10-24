/** Inicia o download de um arquivo do app (rota /api/projects/:id/download). */
export function startDownload(href: string) {
  window.location.assign(href);
}
