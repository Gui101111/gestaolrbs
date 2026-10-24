"use client";

import * as React from "react";

export type Theme = "grafite" | "claro";

export const THEME_STORAGE_KEY = "tribuna-theme";

/** Lê o tema salvo e aplica antes da primeira pintura (evita o "flash"). */
export const themeBootScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="claro"||t==="grafite")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

function readTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "claro" ? "claro" : "grafite";
}

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** Troca o tema com uma transição curta de cores e grava a preferência. */
export function applyTheme(next: Theme) {
  const root = document.documentElement;
  if (root.getAttribute("data-theme") === next) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) root.classList.add("theme-switching");
  root.setAttribute("data-theme", next);
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", next === "claro" ? "#eef0f3" : "#1a1d22");
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    /* armazenamento indisponível: vale só para esta visita */
  }
  window.setTimeout(() => root.classList.remove("theme-switching"), 520);
}

export function useTheme() {
  const theme = React.useSyncExternalStore<Theme>(subscribe, readTheme, () => "grafite");
  const setTheme = React.useCallback((next: Theme) => applyTheme(next), []);
  const toggle = React.useCallback(() => applyTheme(readTheme() === "claro" ? "grafite" : "claro"), []);
  return { theme, setTheme, toggle };
}
