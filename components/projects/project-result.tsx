"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { CheckCircle2, Columns2, Copy, Download, GitBranch, MessageSquarePlus, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { VideoPlayer, type VideoPlayerHandle } from "@/components/video/video-player";
import { useProjectMutations } from "@/components/projects/project-actions";
import { approveProjectAction, requestRevisionAction } from "@/lib/actions/projects";
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
};

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
      setRevOpen(false);
      setComment("");
      router.refresh();
    });

  const approve = () =>
    start(async () => {
      const res = await approveProjectAction(project.id);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Vídeo aprovado. Projeto concluído.");
      router.refresh();
    });

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <p className="eyebrow flex items-center gap-2">
            <CheckCircle2 className="size-3.5" /> {project.status === "completed" ? "Projeto concluído" : "Edição finalizada"}
          </p>
          <h1 className="mt-3 font-display text-4xl text-ivory md:text-6xl">
            Seu vídeo <span className="text-gold-gradient italic">está pronto.</span>
          </h1>
          <p className="mt-2 text-sm text-mist">{project.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {current && (
            <Button asChild variant="gold" size="lg" className="glow-gold">
              <a href={`/api/projects/${project.id}/download?render=${current.id}`}>
                <Download /> Baixar MP4
              </a>
            </Button>
          )}
          <Button variant="outline" size="lg" onClick={() => duplicate(project.id, true)} disabled={mutating}>
            <GitBranch /> Criar nova versão
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {ratios.length > 0 && (
              <Tabs value={ratio} onValueChange={setRatio}>
                <TabsList>
                  {ratios.map((r) => (
                    <TabsTrigger key={r} value={r}>
                      {r}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
            <Button variant={compare ? "outline" : "subtle"} size="sm" onClick={() => setCompare((v) => !v)} aria-pressed={compare}>
              <Columns2 /> {compare ? "Ver só o final" : "Comparar com o original"}
            </Button>
          </div>

          <Tabs value={ratio}>
            {ratios.map((r) => {
              const render = latestFor(r);
              const vertical = r === "9:16" || r === "4:5";
              return (
                <TabsContent key={r} value={r} forceMount className={cn(r !== ratio && "hidden")}>
                  <div className={cn("grid gap-4", compare && "md:grid-cols-2")}>
                    {compare && (
                      <div>
                        <p className="mb-2 text-[0.6875rem] font-semibold tracking-[0.25em] text-mist uppercase">Original</p>
                        <VideoPlayer src={original.url} poster={original.poster} aspect={original.aspect} label="Vídeo original" className={cn(vertical && !compare && "mx-auto max-w-sm")} />
                      </div>
                    )}
                    <div>
                      {compare && <p className="mb-2 text-[0.6875rem] font-semibold tracking-[0.25em] text-gold uppercase">Final</p>}
                      <VideoPlayer
                        ref={(h) => {
                          players.current[r] = h;
                        }}
                        src={render?.url ?? null}
                        aspect={r}
                        label={`Vídeo final ${r}`}
                        className={cn(vertical && (compare ? "mx-auto max-h-[70vh] w-auto" : "mx-auto max-h-[78vh] w-auto max-w-md"), "glow-gold-soft")}
                      />
                    </div>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
          {ratios.length === 0 && <p className="text-sm text-mist">Os arquivos finais ainda estão sendo publicados.</p>}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            <p className="eyebrow mb-4">Detalhes</p>
            <dl className="space-y-3 text-sm">
              {[
                ["Duração", formatDuration(current?.durationSec)],
                ["Formato", ratio],
                ["Resolução", current?.width && current?.height ? `${current.width}×${current.height}` : (current?.resolution ?? "—")],
                ["Tamanho", current?.fileSize ? formatBytes(current.fileSize) : "—"],
                ["Data", formatDate(current?.createdAt ?? project.updatedAt)],
                ["Estilo", styleLabel],
                ["Versão", current ? `v${current.version}` : "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-mist">{k}</dt>
                  <dd className="text-right text-ivory">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="grid gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3">
            {project.status === "ready" && (
              <Button variant="gold" onClick={approve} loading={pending}>
                <CheckCircle2 /> Aprovar vídeo
              </Button>
            )}
            <Button variant="subtle" onClick={openRevision} disabled={revisionsLeft === 0}>
              <MessageSquarePlus /> Solicitar ajuste {revisionsLeft != null && <span className="text-xs text-mist">({revisionsLeft} restantes)</span>}
            </Button>
            <Button variant="subtle" onClick={() => duplicate(project.id, true)} disabled={mutating}>
              <Settings2 /> Editar configurações
            </Button>
            <Button variant="subtle" onClick={() => duplicate(project.id)} disabled={mutating}>
              <Copy /> Duplicar projeto
            </Button>
            <Button variant="ghost" className="text-[#ec8a80] hover:text-[#ec8a80]" onClick={() => setDelOpen(true)}>
              <Trash2 /> Excluir
            </Button>
          </div>
        </aside>
      </div>

      <Dialog open={revOpen} onOpenChange={setRevOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar ajuste</DialogTitle>
            <DialogDescription>
              Descreva o que deseja mudar.{" "}
              {mark != null ? (
                <>
                  Marcamos o momento <span className="font-mono text-gold-light">{formatDuration(mark)}</span> do vídeo.{" "}
                  <button type="button" className="underline underline-offset-4" onClick={() => setMark(null)}>
                    remover marcação
                  </button>
                </>
              ) : (
                "Dica: pause o vídeo no ponto exato antes de abrir esta janela."
              )}
            </DialogDescription>
          </DialogHeader>
          <Textarea rows={5} value={comment} maxLength={2000} onChange={(e) => setComment(e.target.value)} placeholder="Ex.: remover o trecho em que repito a explicação sobre o prazo e destacar a palavra “decadência”." />
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
            <AlertDialogTitle>Excluir este projeto?</AlertDialogTitle>
            <AlertDialogDescription>O vídeo original e todas as versões editadas serão removidos definitivamente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove(project.id, "/app/biblioteca")}>Excluir definitivamente</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
