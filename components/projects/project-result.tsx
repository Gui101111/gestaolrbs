"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { CheckCircle2, Clock, Download, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Aurora } from "@/components/effects/aurora";
import { VideoPlayer, type VideoPlayerHandle } from "@/components/video/video-player";
import { TargetBadge } from "@/components/projects/target-badge";
import { requestRevisionAction } from "@/lib/actions/projects";
import { notifyEditingQueued } from "@/components/editing/browser-runner";
import type { VideoTarget } from "@/lib/constants/domain";
import { cn, formatBytes, formatDuration } from "@/lib/utils";

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

/** Vídeo pronto: player, baixar e pedir ajuste. */
export function ProjectResult({
  project,
  renders,
  revisionsLeft,
  target,
}: {
  project: { id: string; name: string };
  renders: ResultRender[];
  revisionsLeft: number | null;
  target: { value: VideoTarget; short: string } | null;
}) {
  const router = useRouter();
  const ratios = Array.from(new Set(renders.map((r) => r.aspectRatio)));
  const [ratio, setRatio] = React.useState(ratios[0] ?? "9:16");
  const [revOpen, setRevOpen] = React.useState(false);
  const [comment, setComment] = React.useState("");
  const [mark, setMark] = React.useState<number | null>(null);
  const [pending, start] = React.useTransition();
  const players = React.useRef<Record<string, VideoPlayerHandle | null>>({});

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
      toast.success("Ajuste pedido. Avisaremos quando a nova versão estiver pronta.");
      notifyEditingQueued();
      setRevOpen(false);
      setComment("");
      router.refresh();
    });

  const details = [
    current?.width && current?.height ? `${current.width}×${current.height}` : current?.resolution,
    current?.durationSec ? formatDuration(current.durationSec) : null,
    current?.fileSize ? formatBytes(current.fileSize) : null,
    current && current.version > 1 ? `versão ${current.version}` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
        <p className="flex items-center gap-2 text-sm font-semibold text-success">
          <CheckCircle2 className="size-4" /> Edição finalizada
        </p>
        <h1 className="mt-2 text-4xl text-fg md:text-5xl">
          Seu vídeo está <em>pronto</em>.
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-fg-2">
          <span className="min-w-0 truncate">{project.name}</span>
          {target && <TargetBadge target={target} />}
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1fr_19rem]">
        <div className="glass relative overflow-hidden rounded-[28px] p-3 md:p-4">
          <Aurora variant="subtle" interactive={false} />
          {ratios.length > 1 && (
            <div className="relative mb-3">
              <Tabs value={ratio} onValueChange={setRatio}>
                <TabsList aria-label="Formatos">
                  {ratios.map((r) => (
                    <TabsTrigger key={r} value={r} className="font-mono">
                      {r}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          )}

          {ratios.length === 0 ? (
            <p className="relative py-16 text-center text-sm text-fg-2">Os arquivos finais ainda estão sendo publicados.</p>
          ) : (
            ratios.map((r) => {
              const render = latestFor(r);
              const isVertical = r === "9:16" || r === "4:5";
              return (
                <div key={r} className={cn("relative", r !== ratio && "hidden")}>
                  <VideoPlayer
                    ref={(h) => {
                      players.current[r] = h;
                    }}
                    src={render?.url ?? null}
                    poster={render?.poster ?? null}
                    aspect={r}
                    label={`Vídeo final ${r}`}
                    className={cn(
                      isVertical && "mx-auto max-h-[72vh] w-auto max-w-sm",
                      "shadow-[0_0_0_1px_color-mix(in_oklab,var(--cyan)_20%,transparent),0_30px_80px_-30px_rgb(0_0_0/0.8)]",
                    )}
                  />
                </div>
              );
            })
          )}
        </div>

        <aside className="space-y-3">
          <div className="glass grid gap-2 rounded-[22px] p-3">
            {current && (
              <Button asChild variant="gold" size="lg" pulse>
                <a href={`/api/projects/${project.id}/download?render=${current.id}`}>
                  <Download /> {target ? `Baixar para ${target.short}` : "Baixar vídeo"}
                </a>
              </Button>
            )}
            <Button variant="glass" size="lg" onClick={openRevision} disabled={revisionsLeft === 0}>
              <MessageSquarePlus /> Pedir ajuste
              {revisionsLeft != null && <span className="text-xs text-fg-3">({revisionsLeft})</span>}
            </Button>
          </div>
          {details.length > 0 && <p className="px-1 text-xs text-fg-3">{details.join(" · ")}</p>}
        </aside>
      </div>

      <Dialog open={revOpen} onOpenChange={setRevOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pedir ajuste</DialogTitle>
            <DialogDescription>Diga o que mudar. Pause no ponto exato para marcar o tempo.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Clock className="size-4 text-cyan" />
            {mark != null ? (
              <>
                <span className="text-fg-2">Tempo marcado:</span>
                <span className="rounded-md border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-mono text-cyan">{formatDuration(mark)}</span>
                <button type="button" className="min-h-10 px-1 text-xs text-fg-3 underline underline-offset-4 hover:text-fg" onClick={() => setMark(null)}>
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
            placeholder="Ex.: tirar a parte em que repito o prazo e corrigir a palavra “decadência” na legenda."
            aria-label="Descrição do ajuste"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevOpen(false)}>
              Cancelar
            </Button>
            <Button variant="gold" onClick={sendRevision} loading={pending} disabled={comment.trim().length < 3}>
              Enviar pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
