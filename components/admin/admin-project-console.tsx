"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, Film, Loader2, Play, RefreshCw, Send, SkipForward, Trash2, TriangleAlert, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inspectVideo, useTusUpload } from "@/hooks/use-tus-upload";
import {
  adminAddNoteAction,
  adminDeleteRenderAction,
  adminMarkFailedAction,
  adminMarkReadyAction,
  adminRedispatchAction,
  adminRegisterRenderAction,
  adminUpdateJobAction,
} from "@/lib/actions/admin";
import { PIPELINE_STEPS, stepIndex } from "@/lib/constants/domain";
import { formatBytes, formatDateTime, formatDuration, safeFileName } from "@/lib/utils";

type Job = { id: string; status: string; current_step: string; progress: number; provider: string; error_message: string | null; kind: string } | null;
type RenderRow = { id: string; aspect_ratio: string; version: number; url: string | null; file_size: number | null; duration_sec: number | null; created_at: string; published?: boolean };
type Note = { id: string; body: string; created_at: string };

export function AdminProjectConsole({
  projectId,
  ownerId,
  status,
  ratios,
  job,
  renders,
  notes,
  originalUrl,
}: {
  projectId: string;
  ownerId: string;
  status: string;
  ratios: string[];
  job: Job;
  renders: RenderRow[];
  notes: Note[];
  originalUrl: string | null;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [step, setStep] = React.useState(job?.current_step ?? "upload_completed");
  const [note, setNote] = React.useState("");
  const [failMsg, setFailMsg] = React.useState("");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error);
      toast.success(success);
      router.refresh();
    });

  const nextStep = () => {
    const i = stepIndex(step);
    const next = PIPELINE_STEPS[Math.min(i + 1, PIPELINE_STEPS.length - 2)].value;
    setStep(next);
    if (job) run(() => adminUpdateJobAction({ jobId: job.id, step: next, status: "running" }), "Etapa avançada.");
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <div className="space-y-6">
        <section className="rounded-3xl border border-fg/[0.07] bg-fg/[0.02] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl text-ivory">Processamento</h2>
            {originalUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={originalUrl}>
                  <Download /> Baixar original
                </a>
              </Button>
            )}
          </div>
          {job ? (
            <>
              <p className="mt-2 text-xs text-mist">
                Tarefa {job.kind} · provedor <span className="text-ivory/80">{job.provider}</span> · status <span className="text-ivory/80">{job.status}</span>
              </p>
              {job.error_message && <p className="mt-2 text-xs text-destructive">{job.error_message}</p>}
              <div className="mt-5 flex items-center justify-between text-xs">
                <span className="text-gold-light">{PIPELINE_STEPS[stepIndex(job.current_step)]?.label}</span>
                <span className="text-mist tabular-nums">{job.progress}%</span>
              </div>
              <Progress value={job.progress} className="mt-2 h-2" />
              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                <Select value={step} onValueChange={setStep}>
                  <SelectTrigger aria-label="Etapa">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STEPS.slice(0, -1).map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="subtle" disabled={pending} onClick={() => run(() => adminUpdateJobAction({ jobId: job.id, step, status: "running" }), "Etapa atualizada.")}>
                  <Play /> Aplicar etapa
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={nextStep} disabled={pending}>
                  <SkipForward /> Próxima etapa
                </Button>
                <Button variant="ghost" size="sm" onClick={() => run(() => adminRedispatchAction(job.id), "Tarefa reenviada ao processador.")} disabled={pending}>
                  <RefreshCw /> Reenviar ao processador
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-mist">Nenhuma tarefa encontrada.</p>
          )}
        </section>

        <section className="rounded-3xl border border-fg/[0.07] bg-fg/[0.02] p-6">
          <h2 className="font-display text-2xl text-ivory">Entregas por formato</h2>
          <p className="mt-1 text-sm text-mist">Envie o MP4 editado de cada proporção. Novas entregas viram uma nova versão.</p>
          <div className="mt-5 space-y-4">
            {ratios.map((r) => (
              <RenderUploader key={r} ratio={r} ownerId={ownerId} projectId={projectId} onDone={() => router.refresh()} />
            ))}
          </div>
          {renders.length > 0 && (
            <ul className="mt-6 divide-y divide-fg/[0.05] border-t border-fg/[0.06]">
              {renders.map((rd) => (
                <li key={rd.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="flex items-center gap-3">
                    <Film className="size-4 text-gold" />
                    <span>
                      <span className="text-ivory">
                        {rd.aspect_ratio} · v{rd.version}
                        {rd.published === false && <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-[0.6875rem] font-semibold text-warning">em revisão</span>}
                      </span>
                      <span className="block text-xs text-mist">
                        {formatBytes(rd.file_size)} · {formatDuration(rd.duration_sec)} · {formatDateTime(rd.created_at)}
                      </span>
                    </span>
                  </span>
                  <span className="flex gap-1">
                    {rd.url && (
                      <Button asChild variant="ghost" size="icon-sm" aria-label="Assistir">
                        <a href={rd.url} target="_blank" rel="noreferrer">
                          <Play />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon-sm" aria-label="Remover entrega" onClick={() => run(() => adminDeleteRenderAction(rd.id), "Entrega removida.")}>
                      <Trash2 />
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="gold" disabled={pending || renders.length === 0 || status === "ready" || status === "completed"} onClick={() => run(() => adminMarkReadyAction(projectId), "Projeto marcado como pronto. Cliente notificado.")}>
              <CheckCircle2 /> Marcar como pronto
            </Button>
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-3xl border border-fg/[0.07] bg-fg/[0.02] p-6">
          <h2 className="font-display text-2xl text-ivory">Notas internas</h2>
          <Textarea className="mt-4" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Visível somente para a equipe." />
          <Button
            className="mt-3"
            variant="subtle"
            size="sm"
            disabled={!note.trim() || pending}
            onClick={() =>
              run(async () => {
                const r = await adminAddNoteAction(projectId, note);
                if (r.ok) setNote("");
                return r;
              }, "Nota adicionada.")
            }
          >
            <Send /> Adicionar nota
          </Button>
          <ul className="mt-5 space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="rounded-xl border border-fg/[0.06] p-3 text-sm">
                <p className="text-xs text-mist">{formatDateTime(n.created_at)}</p>
                <p className="mt-1 whitespace-pre-line text-ivory/90">{n.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-destructive/20 bg-destructive/[0.03] p-6">
          <h2 className="flex items-center gap-2 font-display text-2xl text-ivory">
            <TriangleAlert className="size-5 text-destructive" /> Falha no processamento
          </h2>
          <Textarea className="mt-4" rows={2} value={failMsg} onChange={(e) => setFailMsg(e.target.value)} placeholder="Mensagem amigável para o cliente (opcional)" />
          <Button className="mt-3" variant="destructive" size="sm" disabled={pending} onClick={() => run(() => adminMarkFailedAction(projectId, failMsg), "Projeto marcado com erro.")}>
            Marcar como erro
          </Button>
        </section>
      </div>
    </div>
  );
}

function RenderUploader({ ratio, ownerId, projectId, onDone }: { ratio: string; ownerId: string; projectId: string; onDone: () => void }) {
  const { state, start } = useTusUpload();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);

  const pick = async (file?: File) => {
    if (!file) return;
    if (!/^video\/(mp4|quicktime|webm)$/.test(file.type)) return void toast.error("Envie um arquivo de vídeo MP4.");
    setBusy(true);
    const meta = await inspectVideo(file);
    const path = `${ownerId}/${projectId}/${ratio.replace(":", "x")}-${Date.now()}-${safeFileName(file.name)}`;
    await start(file, {
      bucket: "rendered-videos",
      path,
      onDone: async () => {
        const res = await adminRegisterRenderAction({
          projectId,
          aspectRatio: ratio as "9:16",
          path,
          fileName: file.name,
          width: meta.width,
          height: meta.height,
          durationSec: meta.duration,
          sizeBytes: file.size,
        });
        setBusy(false);
        if (!res.ok) return void toast.error(res.error);
        toast.success(`Entrega ${ratio} registrada.`);
        onDone();
      },
    });
  };

  const uploading = state.status === "uploading" || state.status === "paused" || state.status === "offline";
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-dashed border-fg/10 p-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/[0.06] font-mono text-xs text-gold-light">{ratio}</span>
      <div className="min-w-0 flex-1">
        {uploading ? (
          <>
            <p className="text-xs text-mist">Enviando… {Math.round("progress" in state ? state.progress : 0)}%</p>
            <Progress value={"progress" in state ? state.progress : 0} className="mt-2" />
          </>
        ) : state.status === "error" ? (
          <p className="text-xs text-destructive">Falha no envio. Tente novamente.</p>
        ) : (
          <p className="text-sm text-mist">MP4 final na proporção {ratio}</p>
        )}
      </div>
      <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} aria-label={`Enviar vídeo ${ratio}`} />
      <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy || uploading}>
        {busy || uploading ? <Loader2 className="animate-spin" /> : <Upload />} Enviar
      </Button>
    </div>
  );
}
