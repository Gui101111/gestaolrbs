import * as React from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MotionProvider } from "@/components/animations/motion-provider";
import { SmoothScroll } from "@/components/animations/smooth-scroll";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { CookieBanner } from "@/components/shared/cookie-banner";
import { Hero } from "@/components/landing/hero";
import { MarqueeBand } from "@/components/landing/marquee-band";
import { Explore } from "@/components/landing/explore";
import { FinalCta } from "@/components/landing/final-cta";
import { DockedStatue, StatueDockProvider } from "@/components/landing/statue-dock";
import { BrowserEditor } from "@/components/browser-editor/browser-editor";
import type { EditorDeps } from "@/lib/browser-editor/pipeline";
import { getSample } from "@/lib/browser-editor/runtime";
import type { TransformersLike, WhisperManifest } from "@/lib/browser-editor/transcribe";
import type { Plan } from "@/types/domain";
import { OPEN_EDITOR } from "./shims/next-link";
import plans from "./plans.json";

declare const __WHISPER__: WhisperManifest | null;

document.documentElement.dataset.theme = "grafite";
document.documentElement.lang = "pt-BR";

/** transformers.js fica em asr.js e só é baixado quando a transcrição roda. */
function loadAsr(): Promise<TransformersLike> {
  const w = window as unknown as { TribunaASR?: TransformersLike };
  if (w.TribunaASR) return Promise.resolve(w.TribunaASR);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "asr.js";
    s.charset = "utf-8";
    s.async = true;
    s.onload = () => (w.TribunaASR ? resolve(w.TribunaASR) : reject(new Error("asr.js sem o módulo")));
    s.onerror = () => reject(new Error("asr.js não carregou"));
    document.head.appendChild(s);
  });
}

const getDeps = async (): Promise<EditorDeps> => ({
  sample: await getSample(),
  whisper: __WHISPER__ ? { manifest: __WHISPER__, importTransformers: loadAsr } : null,
});

function Landing() {
  const [open, setOpen] = React.useState(() => window.location.hash === "#editor");
  React.useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EDITOR, onOpen);
    return () => window.removeEventListener(OPEN_EDITOR, onOpen);
  }, []);
  return (
    <MotionProvider>
      <TooltipProvider delayDuration={250}>
        <div className="min-h-dvh bg-canvas">
          <SmoothScroll />
          <SiteHeader isAuthenticated={false} />
          <main id="conteudo" className="relative overflow-x-clip">
            <StatueDockProvider>
              <Hero isAuthenticated={false} />
              <MarqueeBand />
              <Explore plans={plans as unknown as Plan[]} isAuthenticated={false} />
              <FinalCta isAuthenticated={false} />
              <DockedStatue />
            </StatueDockProvider>
          </main>
          <SiteFooter />
          <CookieBanner />
        </div>
        <BrowserEditor open={open} onClose={() => setOpen(false)} deps={getDeps} />
      </TooltipProvider>
      <Toaster />
    </MotionProvider>
  );
}

createRoot(document.getElementById("tribuna-root")!).render(<Landing />);
