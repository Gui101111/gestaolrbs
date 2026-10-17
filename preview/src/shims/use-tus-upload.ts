import * as React from "react";
import { db, putFile } from "../demo/db";
import { inspectVideo as realInspect } from "../../../hooks/use-tus-upload";

export type UploadState =
  | { status: "idle" }
  | { status: "uploading" | "paused" | "offline"; progress: number; uploaded: number; total: number; speed: number }
  | { status: "done"; path: string; total: number }
  | { status: "error"; code: "upload_interrupted" | "file_too_large" | "invalid_file" | "session_expired" | "network"; progress: number };

export const inspectVideo = realInspect;

/**
 * "Upload" da demonstração: o arquivo fica guardado no próprio navegador
 * (IndexedDB). O progresso é a leitura real do arquivo, em partes.
 */
export function useTusUpload() {
  const [state, setState] = React.useState<UploadState>({ status: "idle" });
  const ctl = React.useRef<{ paused: boolean; cancelled: boolean; resume?: () => void }>({ paused: false, cancelled: false });

  const start = React.useCallback(async (file: File, opts: { bucket: string; path: string; onDone?: (path: string) => void }) => {
    ctl.current = { paused: false, cancelled: false };
    const total = file.size;
    const chunk = 8 * 1024 * 1024;
    const t0 = performance.now();
    for (let off = 0; off < total; off += chunk) {
      if (ctl.current.cancelled) return;
      if (ctl.current.paused) await new Promise<void>((r) => (ctl.current.resume = r));
      await file.slice(off, Math.min(total, off + chunk)).arrayBuffer();
      const uploaded = Math.min(total, off + chunk);
      const dt = (performance.now() - t0) / 1000;
      setState({ status: "uploading", progress: (uploaded / total) * 100, uploaded, total, speed: dt > 0 ? uploaded / dt : 0 });
      await new Promise((r) => setTimeout(r, 40));
    }
    await putFile(`${opts.bucket}/${opts.path}`, file);
    db.insert("storage_objects", { bucket: opts.bucket, name: opts.path, size: file.size, mime: file.type });
    setState({ status: "done", path: opts.path, total });
    opts.onDone?.(opts.path);
  }, []);

  const pause = React.useCallback(() => {
    ctl.current.paused = true;
    setState((s) => (s.status === "uploading" ? { ...s, status: "paused" } : s));
  }, []);

  const resume = React.useCallback(() => {
    ctl.current.paused = false;
    ctl.current.resume?.();
    setState((s) => (s.status === "paused" ? { ...s, status: "uploading" } : s));
  }, []);

  const cancel = React.useCallback(async () => {
    ctl.current.cancelled = true;
    ctl.current.resume?.();
    setState({ status: "idle" });
  }, []);

  return { state, start, pause, resume, cancel };
}
