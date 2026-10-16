import type * as React from "react";

/**
 * Atualiza --mx/--my no elemento para a borda que acende seguindo o cursor
 * (utilitário CSS `spotlight`). Use em `onPointerMove`.
 */
export function onSpotlightMove(e: React.PointerEvent<HTMLElement>) {
  if (e.pointerType !== "mouse") return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
}
