"use client";

import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { scrollToHash } from "@/lib/scroll";

export function Providers({ children }: { children: React.ReactNode }) {
  // Intercepta todos os links internos (#secao) para usar a rolagem suave própria
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!a) return;
      const hash = a.getAttribute("href")!;
      if (hash.length < 2 || !document.querySelector(hash)) return;
      e.preventDefault();
      // espera menus/overlays fecharem e liberarem o scroll
      setTimeout(() => scrollToHash(hash), document.body.style.overflow === "hidden" ? 80 : 0);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
