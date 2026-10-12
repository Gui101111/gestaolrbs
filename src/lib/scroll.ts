import { animate } from "framer-motion";

/**
 * Rolagem suave até uma âncora. Feita em JS porque a rolagem nativa do navegador
 * é interrompida pelas seções com scroll fixo (sticky) e animações de layout.
 */
export function scrollToHash(hash: string) {
  const el = hash === "#" ? document.body : document.querySelector<HTMLElement>(hash);
  if (!el) return;
  const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 0;
  const target = Math.max(0, el.getBoundingClientRect().top + window.scrollY - (hash === "#inicio" ? 0 : header));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  history.replaceState(null, "", hash);
  if (reduce) {
    window.scrollTo(0, target);
  } else {
    const distance = Math.abs(target - window.scrollY);
    animate(window.scrollY, target, {
      duration: Math.min(1.6, 0.5 + distance / 4000),
      ease: [0.65, 0, 0.35, 1],
      onUpdate: (v) => window.scrollTo(0, v),
    });
  }
  // move o foco para a seção (acessibilidade)
  el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
}
