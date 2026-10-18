"use client";

import * as React from "react";
import * as tus from "tus-js-client";
import { createClient } from "@/lib/supabase/client";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";
import { rememberLocalFile } from "@/lib/browser-editor/local-files";

export type UploadState =
  | { status: "idle" }
  | { status: "uploading" | "paused" | "offline"; progress: number; uploaded: number; total: number; speed: number }
  | { status: "done"; path: string; total: number }
  | { status: "error"; code: "upload_interrupted" | "file_too_large" | "invalid_file" | "session_expired" | "network"; progress: number };

/** Endpoint TUS do Supabase. Em projetos hospedados usa o host dedicado de storage (mais rápido para arquivos grandes). */
function tusEndpoint() {
  const url = new URL(supabaseUrl());
  const hosted = url.hostname.match(/^([a-z0-9]+)\.supabase\.co$/);
  if (hosted) return `https://${hosted[1]}.storage.supabase.co/storage/v1/upload/resumable`;
  return `${url.origin}/storage/v1/upload/resumable`;
}

/**
 * Upload retomável (TUS) direto do navegador para o Supabase Storage.
 * O arquivo nunca passa pelo servidor do Next. Suporta pausar/retomar,
 * reconexão automática e retomada após recarregar a página (fingerprint).
 */
export function useTusUpload() {
  const [state, setState] = React.useState<UploadState>({ status: "idle" });
  const uploadRef = React.useRef<tus.Upload | null>(null);
  const lastTick = React.useRef<{ t: number; bytes: number }>({ t: 0, bytes: 0 });
  const speedRef = React.useRef(0);

  const start = React.useCallback(async (file: File, opts: { bucket: string; path: string; contentType?: string; onDone?: (path: string) => void }) => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setState({ status: "error", code: "session_expired", progress: 0 });
      return;
    }
    lastTick.current = { t: performance.now(), bytes: 0 };
    speedRef.current = 0;

    const upload = new tus.Upload(file, {
      endpoint: tusEndpoint(),
      retryDelays: [0, 2000, 5000, 10000, 20000, 30000],
      headers: {
        apikey: supabasePublishableKey(),
        "x-upsert": "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024, // exigido pelo Supabase
      metadata: {
        bucketName: opts.bucket,
        objectName: opts.path,
        contentType: opts.contentType ?? (file.type || "video/mp4"),
        cacheControl: "3600",
      },
      onBeforeRequest: async (req) => {
        // Definido somente aqui (não em `headers`) para não duplicar o cabeçalho.
        // Uploads longos: usa sempre o token mais recente da sessão.
        const { data: s } = await supabase.auth.getSession();
        req.setHeader("authorization", `Bearer ${s.session?.access_token ?? data.session!.access_token}`);
      },
      onProgress: (uploaded, total) => {
        const now = performance.now();
        const dt = (now - lastTick.current.t) / 1000;
        if (dt > 0.5) {
          const inst = (uploaded - lastTick.current.bytes) / dt;
          speedRef.current = speedRef.current ? speedRef.current * 0.7 + inst * 0.3 : inst;
          lastTick.current = { t: now, bytes: uploaded };
        }
        setState({
          status: navigator.onLine ? "uploading" : "offline",
          progress: total ? (uploaded / total) * 100 : 0,
          uploaded,
          total,
          speed: speedRef.current,
        });
      },
      onError: (err) => {
        const res = (err as tus.DetailedError).originalResponse;
        const status = res?.getStatus();
        const body = res?.getBody() ?? "";
        const code =
          status === 413 || /maximum allowed size|too large/i.test(body)
            ? "file_too_large"
            : status === 415 || /mime/i.test(body)
              ? "invalid_file"
              : status === 401 || status === 403
                ? "session_expired"
                : navigator.onLine
                  ? "upload_interrupted"
                  : "network";
        setState((s) => ({ status: "error", code, progress: "progress" in s ? s.progress : 0 }));
      },
      onSuccess: () => {
        rememberLocalFile(opts.path, file);
        setState({ status: "done", path: opts.path, total: file.size });
        opts.onDone?.(opts.path);
      },
    });
    uploadRef.current = upload;

    const previous = await upload.findPreviousUploads();
    if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
    setState({ status: "uploading", progress: 0, uploaded: 0, total: file.size, speed: 0 });
    upload.start();
  }, []);

  const pause = React.useCallback(() => {
    uploadRef.current?.abort();
    setState((s) => (s.status === "uploading" || s.status === "offline" ? { ...s, status: "paused" } : s));
  }, []);

  const resume = React.useCallback(() => {
    if (!uploadRef.current) return;
    setState((s) => (s.status === "paused" || s.status === "error" ? { status: "uploading", progress: s.progress, uploaded: 0, total: 0, speed: 0 } : s));
    uploadRef.current.start();
  }, []);

  const cancel = React.useCallback(async () => {
    const u = uploadRef.current;
    uploadRef.current = null;
    if (u) await u.abort(true).catch(() => undefined);
    setState({ status: "idle" });
  }, []);

  // Reconexão automática
  React.useEffect(() => {
    const onOnline = () => {
      setState((s) => {
        if ((s.status === "offline" || (s.status === "error" && s.code === "network")) && uploadRef.current) {
          uploadRef.current.start();
          return { status: "uploading", progress: s.progress, uploaded: 0, total: 0, speed: 0 };
        }
        return s;
      });
    };
    const onOffline = () => setState((s) => (s.status === "uploading" ? { ...s, status: "offline" } : s));
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  React.useEffect(() => () => void uploadRef.current?.abort(), []);

  return { state, start, pause, resume, cancel };
}

/** Lê duração, resolução e captura uma miniatura do vídeo no navegador. */
export async function inspectVideo(file: File): Promise<{ duration: number | null; width: number | null; height: number | null; thumbnail: Blob | null; previewUrl: string }> {
  const previewUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  video.src = previewUrl;
  video.load();

  const meta = await new Promise<boolean>((resolve) => {
    const t = window.setTimeout(() => resolve(false), 8000);
    video.onloadedmetadata = () => {
      window.clearTimeout(t);
      resolve(true);
    };
    video.onerror = () => {
      window.clearTimeout(t);
      resolve(false);
    };
  });
  if (!meta) return { duration: null, width: null, height: null, thumbnail: null, previewUrl };

  const duration = Number.isFinite(video.duration) ? video.duration : null;
  const width = video.videoWidth || null;
  const height = video.videoHeight || null;

  let thumbnail: Blob | null = null;
  try {
    video.currentTime = Math.min(1.2, (duration ?? 2) / 3);
    await new Promise<void>((resolve, reject) => {
      const t = window.setTimeout(() => reject(new Error("seek_timeout")), 6000);
      video.onseeked = () => {
        window.clearTimeout(t);
        resolve();
      };
    });
    const max = 960;
    const scale = width && height ? Math.min(1, max / Math.max(width, height)) : 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round((width ?? 640) * scale);
    canvas.height = Math.round((height ?? 360) * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    thumbnail = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  } catch {
    thumbnail = null;
  }
  return { duration, width, height, thumbnail, previewUrl };
}
