"use client";

import * as React from "react";

const KEY = "tribuna-panel-collapsed";
const EVENT = "tribuna:panel";

function read() {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Painel secundário recolhido? Preferência local, por navegador. */
export function usePanelCollapsed() {
  const collapsed = React.useSyncExternalStore(subscribe, read, () => false);
  const setCollapsed = React.useCallback((v: boolean) => {
    try {
      window.localStorage.setItem(KEY, v ? "1" : "0");
    } catch {
      /* sem armazenamento: vale até recarregar */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [collapsed, setCollapsed] as const;
}
