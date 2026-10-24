"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Loader2, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InstagramIcon, TiktokIcon } from "@/components/brand/social-icons";
import { VideoUploader, type UploadedVideo } from "@/components/upload/video-uploader";
import { notifyEditingQueued } from "@/components/editing/browser-runner";
import { createDraftAction, registerFileAction, removeOriginalAction, setThumbnailAction, startEditingAction } from "@/lib/actions/projects";
import { BUCKETS, DEFAULT_VIDEO_TARGET, VIDEO_TARGETS, isVideoTarget, type VideoTarget } from "@/lib/constants/domain";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import { cn, safeFileName } from "@/lib/utils";

export type DraftVideo = {
  fileName: string;
  sizeBytes: number | null;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  previewUrl: string | null;
  thumbnailUrl: string | null;
};

/** Palavras que não dizem nada sobre o vídeo (nomes automáticos de câmera, galeria e apps). */
const GENERIC = new Set(
  "img vid video videos mov movie mvi dsc dscn dscf pxl gopr clip rec record recording screen tela captura gravacao gravação rpreplay final trim whatsapp signal telegram camera cam untitled sem titulo título novo new copy copia cópia at de da do e".split(" "),
);

/**
 * Nome do vídeo a partir do arquivo ("Revisão da aposentadoria.mp4" →
 * "Revisão da aposentadoria"). Nomes automáticos (1000012345, IMG_1234,
 * VID-20241023-WA0001…) viram "Vídeo de 23/10 14:05".
 */
export function videoNameFrom(fileName: string, now = new Date()) {
  const base = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = base.split(/[\s.-]+/).filter(Boolean);
  const meaningful = words.some((w) => /^[a-zà-ÿ]{2,}$/i.test(w) && !GENERIC.has(w.toLowerCase()));
  if (meaningful) return base.slice(0, 80);
  const two = (n: number) => String(n).padStart(2, "0");
  return `Vídeo de ${two(now.getDate())}/${two(now.getMonth() + 1)} ${two(now.getHours())}:${two(now.getMinutes())}`;
}

// --- última escolha de formato, por pessoa (neste navegador) -----------------
const TARGET_EVENT = "tribuna:formato";
const targetKey = (userId: string) => `tribuna-formato:${userId}`;
const memory = new Map<string, VideoTarget>();

function readTarget(userId: string): VideoTarget {
  const mem = memory.get(userId);
  if (mem) return mem;
  try {
    const v = window.localStorage.getItem(targetKey(userId));
    if (isVideoTarget(v)) return v;
  } catch {
    // sem armazenamento: vale o padrão
  }
  return DEFAULT_VIDEO_TARGET;
}

function subscribeTarget(cb: () => void) {
  window.addEventListener(TARGET_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(TARGET_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function useVideoTarget(userId: string) {
  const target = React.useSyncExternalStore(
    subscribeTarget,
    () => readTarget(userId),
    () => DEFAULT_VIDEO_TARGET,
  );
  const setTarget = React.useCallback(
    (v: VideoTarget) => {
      memory.set(userId, v);
      try {
        window.localStorage.setItem(targetKey(userId), v);
      } catch {
        // sem armazenamento: vale até recarregar
      }
      window.dispatchEvent(new Event(TARGET_EVENT));
    },
    [userId],
  );
  return [target, setTarget] as const;
}

const TARGET_ICONS: Record<VideoTarget, React.ComponentType<{ className?: string }>> = { reels: InstagramIcon, tiktok: TiktokIcon };

/** Reels ou TikTok: as duas únicas opções, uma de cada vez. */
function TargetChoice({ value, onChange, disabled }: { value: VideoTarget; onChange: (v: VideoTarget) => void; disabled?: boolean }) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const next = (i + 1) % VIDEO_TARGETS.length;
    onChange(VIDEO_TARGETS[next].value);
    refs.current[next]?.focus();
  };
  return (
    <div className="mx-auto w-full max-w-md">
      <p id="formato-label" className="mb-2 text-center text-[0.6875rem] font-bold tracking-[0.16em] text-fg-3 uppercase">
        Formato
      </p>
      <div role="radiogroup" aria-labelledby="formato-label" aria-describedby="formato-dica" className="glass grid grid-cols-2 gap-1 rounded-full p-1">
        {VIDEO_TARGETS.map((t, i) => {
          const on = value === t.value;
          const Icon = TARGET_ICONS[t.value];
          return (
            <button
              key={t.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(t.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "relative flex min-h-12 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold transition-colors duration-300 disabled:opacity-60",
                on ? "text-[#06222a]" : "text-fg-2 hover:text-fg",
              )}
            >
              {on && (
                <motion.span
                  layoutId="formato-ativo"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,var(--cyan),color-mix(in_oklab,var(--cyan)_55%,var(--azure)))] shadow-[var(--glow-cyan)]"
                />
              )}
              <Icon className="relative size-4" />
              <span className="relative">{t.label}</span>
            </button>
          );
        })}
      </div>
      <p id="formato-dica" className="mt-2 text-center text-xs text-fg-3">
        Os dois são verticais (9:16); muda só a área livre para a legenda de cada app.
      </p>
    </div>
  );
}

/**
 * O envio inteiro numa tela: escolhe Reels ou TikTok, solta o vídeo e pronto.
 * Cria o vídeo, envia o arquivo e manda para a edição sozinho, depois abre a
 * página do vídeo com o progresso. `draft` retoma um envio que não terminou.
 */
export function QuickUpload({
  userId,
  folderId = null,
  draft = null,
  maxBytes,
  maxDurationSec,
}: {
  userId: string;
  folderId?: string | null;
  draft?: { id: string; video: DraftVideo | null } | null;
  maxBytes: number;
  maxDurationSec: number | null;
}) {
  const router = useRouter();
  const [target, setTarget] = useVideoTarget(userId);
  const [existing, setExisting] = React.useState<DraftVideo | null>(draft?.video ?? null);
  const [phase, setPhase] = React.useState<"idle" | "starting" | "failed">("idle");
  const [error, setError] = React.useState<string | null>(null);
  // arquivo enviado mas ainda não registrado (para tentar de novo sem reenviar)
  const [unregistered, setUnregistered] = React.useState<UploadedVideo | null>(null);
  const idRef = React.useRef<string | null>(draft?.id ?? null);
  // O envio termina depois (callback guardado no início): lê sempre a escolha atual
  const targetRef = React.useRef(target);
  React.useEffect(() => {
    targetRef.current = target;
  }, [target]);

  const ensurePath = async (file: File) => {
    let id = idRef.current;
    if (!id) {
      const res = await createDraftAction({ name: videoNameFrom(file.name), folderId, target: targetRef.current });
      if (!res.ok) {
        toast.error(res.error);
        return null;
      }
      id = res.data.id;
      idRef.current = id;
    }
    return `${userId}/${id}/${Date.now()}-${safeFileName(file.name)}`;
  };

  const start = async () => {
    const id = idRef.current;
    if (!id) return;
    setPhase("starting");
    setError(null);
    const res = await startEditingAction(id, targetRef.current);
    if (!res.ok) {
      setPhase("failed");
      setError(res.error);
      return;
    }
    notifyEditingQueued();
    toast.success("Enviado para edição.");
    router.push(ROUTES.video(id));
  };

  const onUploaded = async (v: UploadedVideo) => {
    const id = idRef.current;
    if (!id) return;
    setPhase("starting");
    setError(null);
    setUnregistered(v);
    const reg = await registerFileAction({
      projectId: id,
      path: v.path,
      fileName: v.fileName,
      mimeType: v.mimeType,
      sizeBytes: v.sizeBytes,
      durationSec: v.durationSec,
      width: v.width,
      height: v.height,
      kind: "original",
    });
    if (!reg.ok) {
      setPhase("failed");
      setError(reg.error);
      return;
    }
    setUnregistered(null);
    if (v.thumbnail) {
      const path = `${userId}/${id}/thumb-${Date.now()}.jpg`;
      const { error: thumbError } = await createClient().storage.from(BUCKETS.thumbnails).upload(path, v.thumbnail, { contentType: "image/jpeg", upsert: true });
      if (!thumbError) await setThumbnailAction(id, path);
    }
    setExisting({ fileName: v.fileName, sizeBytes: v.sizeBytes, durationSec: v.durationSec, width: v.width, height: v.height, previewUrl: v.previewUrl, thumbnailUrl: null });
    await start();
  };

  const onRemove = async () => {
    const id = idRef.current;
    if (!id) return;
    const res = await removeOriginalAction(id);
    if (!res.ok) return void toast.error(res.error);
    setExisting(null);
    setPhase("idle");
    setError(null);
  };

  const busy = phase === "starting";

  return (
    <div className="space-y-5">
      <TargetChoice value={target} onChange={setTarget} disabled={busy} />

      <VideoUploader
        existing={existing}
        maxBytes={maxBytes}
        maxDurationSec={maxDurationSec}
        ensurePath={ensurePath}
        onUploaded={onUploaded}
        onRemove={onRemove}
        disabled={busy}
      />

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-fg-3">
        <ShieldCheck className="size-3.5 shrink-0 text-gold" /> Ao enviar, você confirma que tem o direito de usar este vídeo.
      </p>

      <AnimatePresence mode="wait">
        {busy ? (
          <motion.p
            key="iniciando"
            role="status"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass mx-auto flex w-fit items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-fg"
          >
            <Loader2 className="size-4 animate-spin text-cyan" /> Preparando a edição…
          </motion.p>
        ) : phase === "failed" || existing ? (
          <motion.div
            key="enviar"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 text-center"
          >
            {error && (
              <p role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-left text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
              </p>
            )}
            {(existing || unregistered) && (
              <Button variant="gold" size="lg" pulse onClick={() => void (unregistered ? onUploaded(unregistered) : start())}>
                {error ? <RefreshCw /> : <Send />} {error ? "Tentar de novo" : "Enviar para edição"}
              </Button>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
