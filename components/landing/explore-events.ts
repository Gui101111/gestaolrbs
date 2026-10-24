import type { ExploreTabId } from "@/content/landing";
import { scrollToId } from "@/components/animations/smooth-scroll";

export const EXPLORE_EVENT = "tribuna:explore";

/**
 * Abre uma aba do bloco Explorar (atualiza o hash e rola até o painel).
 * Retorna false quando a página atual não tem o bloco (o chamador navega para "/#aba").
 */
export function openExploreTab(id: ExploreTabId): boolean {
  if (!document.getElementById("explorar")) return false;
  history.replaceState(null, "", `#${id}`);
  window.dispatchEvent(new CustomEvent<ExploreTabId>(EXPLORE_EVENT, { detail: id }));
  scrollToId("explorar");
  return true;
}
