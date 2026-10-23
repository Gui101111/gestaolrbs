/** Arquivo solto na tela de projetos, entregue para a tela de novo vídeo. */
let pending: File | null = null;

export function setPendingFile(file: File) {
  pending = file;
}

export function takePendingFile() {
  const file = pending;
  pending = null;
  return file;
}
