/** Na demonstração quem edita é o worker de src/demo/worker.ts (disparado pelo envio). */
export const EDITING_EVENT = "tribuna:edicao";
export function notifyEditingQueued() {}
export function BrowserEditingRunner(_: { userId: string }) {
  return null;
}
