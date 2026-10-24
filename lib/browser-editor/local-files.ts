/**
 * Vídeos enviados nesta aba, guardados em memória pelo caminho no Storage:
 * a edição no navegador usa o arquivo daqui em vez de baixá-lo de novo.
 */
const files = new Map<string, Blob>();

export function rememberLocalFile(path: string, file: Blob) {
  files.set(path, file);
}

export function localFile(path: string): Blob | null {
  return files.get(path) ?? null;
}
