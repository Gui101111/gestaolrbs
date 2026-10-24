/**
 * Aviso do "Continuar com Google" na demonstração: aqui o login é simulado
 * (não há servidor); no app publicado abre a escolha da conta Google.
 */
type Listener = (resolve: ((go: boolean) => void) | null) => void;
const listeners = new Set<Listener>();
let pending: ((go: boolean) => void) | null = null;

export function onGoogleNotice(fn: Listener) {
  listeners.add(fn);
  fn(pending);
  return () => void listeners.delete(fn);
}

export function askGoogleDemo(): Promise<boolean> {
  return new Promise((resolve) => {
    pending = (go) => {
      pending = null;
      listeners.forEach((l) => l(null));
      resolve(go);
    };
    listeners.forEach((l) => l(pending));
  });
}
