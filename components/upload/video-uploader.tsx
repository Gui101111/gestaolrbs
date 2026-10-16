"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Film, Pause, Play, RefreshCw, Trash2, UploadCloud, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { inspectVideo, useTusUpload, type UploadState } from "@/hooks/use-tus-upload";
import { ACCEPTED_VIDEO_EXT } from "@/lib/constants/domain";
import { messageFor } from "@/lib/errors";
import { cn, formatBytes, formatDuration, safeFileName } from "@/lib/utils";

export type UploadedVideo = {
  path: string;
  fileName: string;
  mimeType: "video/mp4" | "video/quicktime" | "video/webm";
  sizeBytes: number;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  previewUrl: string | null;
  thumbnail: Blob | null;
};

const MIME_BY_EXT: Record<string, UploadedVideo["mimeType"]> = { mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm" };

function detectMime(file: File): UploadedVideo["mimeType"] | null {
  if (file.type === "video/mp4" || file.type === "video/quicktime" || file.type === "video/webm") return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? null;
}

/**
 * Área de envio do vídeo: arrastar e soltar, validação, metadados, miniatura e upload retomável.
 * `ensurePath` permite criar o rascunho do projeto antes do primeiro byte (o caminho depende do id).
 */
export function VideoUploader({
  existing,
  maxBytes,
  maxDurationSec,
  ensurePath,
  onUploaded,
  onRemove,
  disabled,
}: {
  existing: { fileName: string; sizeBytes: number | null; durationSec: number | null; width: number | null; height: number | null; previewUrl: string | null; thumbnailUrl: string | null } | null;
  maxBytes: number;
  maxDurationSec: number | null;
  ensurePath: (file: File, mime: UploadedVideo["mimeType"]) => Promise<string | null>;
  onUploaded: (video: UploadedVideo) => Promise<void> | void;
  onRemove: () => Promise<void> | void;
  disabled?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [warning, setWarning] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<(Omit<UploadedVideo, "path"> & { file: File }) | null>(null);
  const [preparing, setPreparing] = React.useState(false);
  const { state, start, pause, resume, cancel } = useTusUpload();

  const pick = async (file: File | undefined) => {
    if (!file || disabled) return;
    setError(null);
    setWarning(null);
    const mime = detectMime(file);
    if (!mime) return setError(messageFor("invalid_file"));
    if (file.size > maxBytes) return setError(`O arquivo tem ${formatBytes(file.size)}. O limite do seu plano é ${formatBytes(maxBytes)}.`);

    setPreparing(true);
    const meta = await inspectVideo(file);
    if (meta.duration == null) setWarning("Não foi possível pré-visualizar este arquivo no navegador, mas o envio funciona normalmente.");
    else if (maxDurationSec && meta.duration > maxDurationSec)
      setWarning(`Este vídeo tem ${formatDuration(meta.duration)}. Seu plano permite até ${formatDuration(maxDurationSec)} por vídeo.`);

    const info = {
      file,
      fileName: file.name,
      mimeType: mime,
      sizeBytes: file.size,
      durationSec: meta.duration,
      width: meta.width,
      height: meta.height,
      previewUrl: meta.previewUrl,
      thumbnail: meta.thumbnail,
    };
    setPending(info);
    const path = await ensurePath(file, mime);
    setPreparing(false);
    if (!path) {
      setPending(null);
      return setError(messageFor("unknown"));
    }
    await start(file, {
      bucket: "original-videos",
      path,
      onDone: async (p) => {
        const { file: _f, ...rest } = info;
        void _f;
        await onUploaded({ ...rest, path: p });
      },
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void pick(e.dataTransfer.files?.[0]);
  };

  const reset = async () => {
    await cancel();
    if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    setPending(null);
    setError(null);
    setWarning(null);
  };

  const showExisting = !pending && existing;
  const active = pending && state.status !== "idle";

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept={`video/mp4,video/quicktime,video/webm,${ACCEPTED_VIDEO_EXT.join(",")}`}
        className="sr-only"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
        aria-label="Selecionar vídeo"
      />

      <AnimatePresence mode="wait">
        {showExisting ? (
          <motion.div key="existing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <FileSummary
              name={existing.fileName}
              size={existing.sizeBytes}
              duration={existing.durationSec}
              width={existing.width}
              height={existing.height}
              previewUrl={existing.previewUrl}
              thumbnailUrl={existing.thumbnailUrl}
              status={<span className="flex items-center gap-1.5 text-xs text-success"><CheckCircle2 className="size-3.5" /> Envio concluído</span>}
              actions={
                <>
                  <Button variant="subtle" size="sm" onClick={() => inputRef.current?.click()} disabled={disabled}>
                    <RefreshCw /> Trocar vídeo
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => void onRemove()} disabled={disabled}>
                    <Trash2 /> Remover
                  </Button>
                </>
              }
            />
          </motion.div>
        ) : active || preparing ? (
          <motion.div key="progress" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <FileSummary
              name={pending?.fileName ?? ""}
              size={pending?.sizeBytes ?? null}
              duration={pending?.durationSec ?? null}
              width={pending?.width ?? null}
              height={pending?.height ?? null}
              previewUrl={pending?.previewUrl ?? null}
              thumbnailUrl={null}
              status={<UploadStatus state={state} preparing={preparing} />}
              progress={state}
              actions={
                <UploadControls state={state} onPause={pause} onResume={resume} onCancel={reset} onRetry={() => pending && void pick(pending.file)} />
              }
            />
          </motion.div>
        ) : (
          <motion.button
            key="drop"
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            disabled={disabled}
            className={cn(
              "group relative flex w-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed px-6 py-14 text-center transition-all duration-500 md:py-20",
              dragging ? "border-gold bg-gold/[0.08] shadow-[0_0_60px_-20px_rgba(198,161,91,0.8)]" : "border-gold/30 bg-gold/[0.025] hover:border-gold/60 hover:bg-gold/[0.05]",
            )}
          >
            <span aria-hidden className="pointer-events-none absolute inset-0 bg-gold-lines opacity-40 [mask-image:radial-gradient(ellipse_at_center,#000,transparent_70%)]" />
            <motion.span
              className="relative grid size-16 place-items-center rounded-2xl border border-gold/40 bg-gold/10 text-gold-light shadow-[0_0_40px_-10px_rgba(198,161,91,0.9)]"
              animate={dragging ? { scale: 1.12, y: -4 } : { scale: 1, y: [0, -5, 0] }}
              transition={dragging ? { type: "spring", stiffness: 300 } : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <UploadCloud className="size-7" />
            </motion.span>
            <span className="relative mt-6 font-display text-2xl text-ivory md:text-3xl">Arraste seu vídeo ou clique para selecionar.</span>
            <span className="relative mt-2 text-sm text-mist">
              MP4, MOV ou WEBM · até {formatBytes(maxBytes, 0)}
              {maxDurationSec ? ` · até ${formatDuration(maxDurationSec)}` : ""}
            </span>
            <span className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-fg/10 px-3 py-1 text-[0.6875rem] text-mist">
              Envio retomável — se a conexão cair, continua de onde parou
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-[#f0a49b]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      )}
      {warning && !error && (
        <p className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/[0.07] px-4 py-3 text-sm text-[#f1cf93]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {warning}
        </p>
      )}
      <p className="text-xs text-mist/70">
        Arquitetura pronta para múltiplos takes: em breve você poderá enviar várias gravações e a IA escolherá os melhores trechos.
      </p>
    </div>
  );
}

function FileSummary({
  name,
  size,
  duration,
  width,
  height,
  previewUrl,
  thumbnailUrl,
  status,
  actions,
  progress,
}: {
  name: string;
  size: number | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  previewUrl: string | null;
  thumbnailUrl: string | null;
  status: React.ReactNode;
  actions: React.ReactNode;
  progress?: UploadState;
}) {
  const pct = progress && "progress" in progress ? progress.progress : progress?.status === "done" ? 100 : 0;
  return (
    <div className="panel gold-ring overflow-hidden rounded-3xl">
      <div className="grid gap-0 md:grid-cols-[minmax(0,0.9fr)_1.1fr]">
        <div className="relative aspect-video bg-black md:aspect-auto md:min-h-64">
          {previewUrl ? (
            <video src={previewUrl} poster={thumbnailUrl ?? undefined} controls playsInline preload="metadata" className="absolute inset-0 h-full w-full object-contain" />
          ) : thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <Film className="size-10 text-gold/40" />
            </div>
          )}
        </div>
        <div className="flex flex-col justify-between gap-5 p-5 md:p-7">
          <div>
            <p className="truncate font-medium text-ivory" title={name}>
              {safeFileName(name) === name ? name : name}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
              <Meta label="Tamanho" value={size ? formatBytes(size) : "—"} />
              <Meta label="Duração" value={formatDuration(duration)} />
              <Meta label="Resolução" value={width && height ? `${width}×${height}` : "—"} />
            </div>
          </div>
          <div className="space-y-3">
            {progress && progress.status !== "done" && (
              <>
                <div className="flex items-center justify-between text-xs">
                  {status}
                  <span className="text-ivory tabular-nums">{Math.round(pct)}%</span>
                </div>
                <Progress value={pct} className="h-2" />
              </>
            )}
            {(!progress || progress.status === "done") && status}
            <div className="flex flex-wrap gap-2">{actions}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-fg/[0.07] bg-fg/[0.02] px-3 py-2">
      <p className="text-[0.625rem] tracking-[0.12em] text-mist uppercase">{label}</p>
      <p className="mt-0.5 font-semibold text-ivory">{value}</p>
    </div>
  );
}

function UploadStatus({ state, preparing }: { state: UploadState; preparing: boolean }) {
  if (preparing) return <span className="text-xs text-mist">Preparando envio…</span>;
  switch (state.status) {
    case "uploading":
      return (
        <span className="text-xs text-gold-light">
          Enviando… {state.total ? `${formatBytes(state.uploaded)} de ${formatBytes(state.total)}` : ""}
          {state.speed > 0 ? ` · ${formatBytes(state.speed)}/s` : ""}
        </span>
      );
    case "paused":
      return <span className="text-xs text-mist">Envio pausado</span>;
    case "offline":
      return (
        <span className="flex items-center gap-1.5 text-xs text-warning">
          <WifiOff className="size-3.5" /> Sem conexão — retomaremos automaticamente
        </span>
      );
    case "done":
      return (
        <span className="flex items-center gap-1.5 text-xs text-success">
          <CheckCircle2 className="size-3.5" /> Envio concluído
        </span>
      );
    case "error":
      return <span className="text-xs text-[#ec8a80]">{messageFor(state.code)}</span>;
    default:
      return null;
  }
}

function UploadControls({
  state,
  onPause,
  onResume,
  onCancel,
  onRetry,
}: {
  state: UploadState;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRetry: () => void;
}) {
  if (state.status === "done") return null;
  return (
    <>
      {state.status === "uploading" && (
        <Button variant="subtle" size="sm" onClick={onPause}>
          <Pause /> Pausar
        </Button>
      )}
      {(state.status === "paused" || state.status === "offline") && (
        <Button variant="outline" size="sm" onClick={onResume}>
          <Play /> Retomar
        </Button>
      )}
      {state.status === "error" && (
        <Button variant="outline" size="sm" onClick={state.code === "upload_interrupted" || state.code === "network" ? onResume : onRetry}>
          <RefreshCw /> Tentar novamente
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={onCancel}>
        <X /> Cancelar
      </Button>
    </>
  );
}
