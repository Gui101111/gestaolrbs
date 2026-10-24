import * as React from "react";

/**
 * Converte "Vídeos jurídicos *editados* por IA." em nós com <em> no trecho
 * entre asteriscos (acento serifado com degradê, definido no CSS base).
 */
export function AccentText({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) => (p.startsWith("*") && p.endsWith("*") ? <em key={i}>{p.slice(1, -1)}</em> : <React.Fragment key={i}>{p}</React.Fragment>))}
    </>
  );
}

/** Mesma regra, no formato de segmentos do AnimatedText. */
export function accentSegments(text: string) {
  return text
    .split(/(\*[^*]+\*)/g)
    .filter(Boolean)
    .map((p) => (p.startsWith("*") && p.endsWith("*") ? { text: p.slice(1, -1), className: "accent-serif" } : { text: p }));
}

/** Texto puro, sem os asteriscos. */
export function plainText(text: string) {
  return text.replace(/\*/g, "");
}
