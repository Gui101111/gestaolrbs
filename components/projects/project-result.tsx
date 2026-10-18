"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { CheckCircle2, Clock, Columns2, Copy, Download, GitBranch, MessageSquarePlus, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Aurora } from "@/components/effects/aurora";
import { VideoPlayer, type VideoPlayerHandle } from "@/components/video/video-player";
import { useProjectMutations } from "@/components/projects/project-actions";
import { StatusTrack } from "@/components/projects/status-track";
import { approveProjectAction, requestRevisionAction } from "@/lib/actions/projects";
import { notifyEditingQueued } from "@/components/editing/browser-runner";
import { ROUTES } from "@/lib/routes";
import { cn, formatBytes, formatDate, formatDuration } from "@/lib/utils";

export type ResultRender = {
  id: string;
  aspectRatio: string;
  url: string | null;
  resolution: string | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  fileSize: number | null;
  version: number;
  createdAt: string;
  /** Miniatura gerada na edição (capa do player). */
  poster?: string | null;
};

const EASE = [0.22, 1, 0.36, 1] as const;

export function ProjectResult({
  project,
  renders,
  original,
  revisionsLeft,
  styleLabel,
}: {
  project: { id: string; name: string; status: string; completedAt: string | null; updatedAt: string };
  renders: ResultRender[];
  original: { url: string | null; aspect: string; poster: string | null };
  revisionsLeft: number | null;
  styleLabel: string;
}) {
  const router = useRouter();
  const ratios = Array.from(new Set(renders.map((r) => r.aspectRatio)));
  const [ratio, setRatio] = React.useState(ratios[0] ?? "9:16");
  const [compare, setCompare] = React.useState(false);
  const [revOpen, setRevOpen] = React.useState(false);
  const [delOpen, setDelOpen] = React.useState(false);
  const [comment, setComment] = React.useState("");
  const [mark, setMark] = React.useState<number | null>(null);
  const [pending, start] = React.useTransition();
  const players = React.useRef<Record<string, VideoPlayerHandle | null>>({});
  const { duplicate, remove, pending: mutating } = useProjectMutations();

  const latestFor = (r: string) => renders.filter((x) => x.aspectRatio === r).sort((a, b) => b.version - a.version)[0];
  const current = latestFor(ratio);
  const vertical = ratio === "9:16" || ratio === "4:5";

  const openRevision = () => {
    const t = players.current[ratio]?.currentTime() ?? null;
    players.current[ratio]?.pause();
    setMark(t && t > 0 ? Math.round(t * 10) / 10 : null);
    setRevOpen(true);
  };

  const sendRevision = () =>
    start(async () => {
      const res = await requestRevisionAction(project.id, comment, mark);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Ajuste solicitado. Avisaremos quando a nova versão estiver pronta.");
      notifyEditingQueued();
      setRevOpen(false);
      setComment("");
      router.refresh();
    });

  const approve = () =>
    start(async () => {
      const res = await approveProjectAction(project.id);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Vídeo aprovado.");
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
        <p className="flex items-center gap-2 text-sm font-semibold text-success">
          <CheckCircle2 className="size-4" /> {project.status === "completed" ? "Aprovado" : "Edição finalizada"}
        </p>
        <h1 className="mt-2 text-4xl text-fg md:text-5xl">
          Seu vídeo está <em>pronto</em>.
        </h1>
        <p className="mt-1 text-sm text-fg-2">{project.name}</p>
      </motion.div>

      <StatusTrack status={project.status} className="max-w-xl" />

      <div className="grid gap-6 xl:grid-cols-[1fr_19rem]">
        <div className="glass relative overflow-hidden rounded-[28px] p-3 md:p-4">
          <Aurora variant="subtle" interactive={false} />
          <div className="relative mb-3 flex flex-wrap items-center justify-between gap-2">
            {ratios.length > 0 && (
              <Tabs value={ratio} onValueChange={setRatio}>
                <TabsList aria-label="Formatos">
                  {ratios.map((r) => (
                    <TabsTrigger key={r} value={r} className="font-mono">
                      {r}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
            <Button variant={compare ? "neon" : "glass"} size="sm" onClick={() => setCompare((v) => !v)} aria-pressed={compare}>
              <Columns2 /> {compare ? "Só o final" : "Original × final"}
            </Button>
          </div>

          {ratios.length === 0 ? (
            <p className="relative py-16 text-center text-sm text-fg-2">Os arquivos finais ainda estão sendo publicados.</p>
          ) : (
            ratios.map((r) => {
              const render = latestFor(r);
              const isVertical = r === "9:16" || r === "4:5";
              return (
                <div key={r} className={cn("relative", r !== ratio && "hidden")}>
                  <div className={cn("grid items-start gap-4", compare && "md:grid-cols-2")}>
                    {compare && (
                      <div>
                        <p className="mb-2 text-[0.6875rem] font-bold tracking-[0.18em] text-fg-3 uppercase">Original</p>
                        <VideoPlayer src={original.url} poster={original.poster} aspect={original.aspect} label="Vídeo original" />
                      </div>
                    )}
                    <div>
                      {compare && <p className="mb-2 text-[0.6875rem] font-bold tracking-[0.18em] text-cyan uppercase">Final</p>}
                      <VideoPlayer
                        ref={(h) => {
                          players.current[r] = h;
                        }}
                        src={render?.url ?? null}
                        poster={render?.poster ?? null}
                        aspect={r}
                        label={`Vídeo final ${r}`}
                        className={cn(
                          isVertical && !compare && "mx-auto max-h-[72vh] w-auto max-w-sm",
                          "shadow-[0_0_0_1px_color-mix(in_oklab,var(--cyan)_20%,transparent),0_30px_80px_-30px_rgb(0_0_0/0.8)]",
                        )}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <aside className="space-y-4">
          <div className="glass grid gap-2 rounded-[22px] p-3">
            {current && (
              <Button asChild variant="gold" size="lg" pulse>
                <a href={`/api/projects/${project.id}/download?render=${current.id}`}>
                  <Download /> Baixar {ratio}
                </a>
              </Button>
            )}
            <Button variant="glass" onClick={openRevision} disabled={revisionsLeft === 0}>
              <MessageSquarePlus /> Solicitar ajuste
              {revisionsLeft != null && <span className="text-xs text-fg-3">({revisionsLeft})</span>}
            </Button>
            {project.status === "ready" && (
              <Button variant="neon" onClick={approve} loading={pending}>
                <CheckCircle2 /> Aprovar
              </Button>
            )}
            <div className="my-1 h-px bg-line" />
            <Button variant="ghost" onClick={() => duplicate(project.id, true)} disabled={mutating} className="justify-start">
              <GitBranch /> Criar nova versão
            </Button>
            <Button variant="ghost" onClick={() => duplicate(project.id, true)} disabled={mutating} className="justify-start">
              <Settings2 /> Editar configurações
            </Button>
            <Button variant="ghost" onClick={() => duplicate(project.id)} disabled={mutating} className="justify-start">
              <Copy /> Duplicar
            </Button>
            <Button variant="ghost" className="justify-start text-destructive hover:text-destructive" onClick={() => setDelOpen(true)}>
              <Trash2 /> Excluir
            </Button>
          </div>

          <div className="glass rounded-[22px] p-5">
            <dl className="space-y-2.5 text-sm">
              {[
                ["Duração", formatDuration(current?.durationSec)],
                ["Formato", ratio],
                ["Resolução", current?.width && current?.height ? `${current.width}×${current.height}` : (current?.resolution ?? "—")],
                ["Tamanho", current?.fileSize ? formatBytes(current.fileSize) : "—"],
                ["Estilo", styleLabel],
                ["Versão", current ? `v${current.version}` : "—"],
                ["Data", formatDate(current?.createdAt ?? project.updatedAt)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-fg-3">{k}</dt>
                  <dd className="text-right font-medium text-fg">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          {vertical && <p className="px-1 text-xs text-fg-3">Dica: publique o 9:16 em Reels, TikTok e Shorts.</p>}
        </aside>
      </div>

      <Dialog open={revOpen} onOpenChange={setRevOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar ajuste</DialogTitle>
            <DialogDescription>Diga o que mudar. Pause no ponto exato para marcar o tempo.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Clock className="size-4 text-cyan" />
            {mark != null ? (
              <>
                <span className="text-fg-2">Tempo marcado:</span>
                <span className="rounded-md border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-mono text-cyan">{formatDuration(mark)}</span>
                <button type="button" className="text-xs text-fg-3 underline underline-offset-4 hover:text-fg" onClick={() => setMark(null)}>
                  remover
                </button>
              </>
            ) : (
              <span className="text-fg-3">Sem tempo marcado (vale para o vídeo todo).</span>
            )}
          </div>
          <Textarea
            id="revision-comment"
            rows={5}
            value={comment}
            maxLength={2000}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ex.: remover a parte em que repito o prazo e destacar “decadência”."
            aria-label="Descrição do ajuste"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevOpen(false)}>
              Cancelar
            </Button>
            <Button variant="gold" onClick={sendRevision} loading={pending} disabled={comment.trim().length < 3}>
              Enviar ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este vídeo?</AlertDialogTitle>
            <AlertDialogDescription>O original e todas as versões editadas serão removidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove(project.id, ROUTES.projects)}>Excluir definitivamente</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
