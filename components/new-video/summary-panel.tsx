"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Clapperboard, Folder, FolderRoot } from "lucide-react";
import { folderColor } from "@/components/folders/folder-colors";
import { useFolders } from "@/components/folders/folders-context";
import { landing } from "@/content/landing";
import { modeloById } from "@/config/modelos";
import { LEGAL_AREAS, labelOf } from "@/lib/constants/domain";
import { DETAIL_QUESTIONS } from "@/lib/constants/questions";
import { cn, formatDuration } from "@/lib/utils";
import type { Draft, DraftVideo } from "@/components/new-video/types";

/** Resumo fixo que se atualiza ao vivo (dispensa a etapa de revisão). */
export function SummaryPanel({ d, video, className }: { d: Draft; video: DraftVideo | null; className?: string }) {
  const folders = useFolders();
  const folder = folders.find((f) => f.id === d.folder_id);
  const yes = DETAIL_QUESTIONS.filter((q) => d.answers[q.id] === "sim" || d.answers[q.id] === "outro");
  const modelo = modeloById(d.template);

  return (
    <aside className={cn("glass overflow-hidden rounded-[24px]", className)} aria-label="Resumo do vídeo">
      <div className="theme-stage relative aspect-video bg-[#0e1014]">
        {video?.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={video.thumbnailUrl} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--cyan)_18%,transparent),transparent_70%)]">
            <Clapperboard className="size-8 text-white/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
        <div className="absolute right-3 bottom-3 left-3">
          <AnimatePresence mode="wait">
            <motion.p key={d.name} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="truncate font-display text-lg font-bold text-white">
              {d.name || "Novo vídeo"}
            </motion.p>
          </AnimatePresence>
          {video && <p className="text-xs text-white/70">{formatDuration(video.durationSec)}</p>}
        </div>
      </div>

      <dl className="divide-y divide-line text-sm">
        <Row label="Pasta">
          <span className="flex items-center gap-1.5">
            {folder ? <Folder className="size-3.5" style={{ color: folderColor(folder.color) }} /> : <FolderRoot className="size-3.5 text-fg-3" />}
            {folder?.name ?? "Projetos"}
          </span>
        </Row>
        <Row label="Área">{d.legal_area ? labelOf(LEGAL_AREAS, d.legal_area) : <Empty />}</Row>
        <Row label="Estilo">{d.editing_style ? landing.styleNames[d.editing_style] : <Empty />}</Row>
        <Row label="Formatos">
          {d.aspect_ratios.length ? (
            <span className="flex flex-wrap justify-end gap-1">
              {d.aspect_ratios.map((r) => (
                <motion.span layout key={r} className="rounded-md border border-cyan/40 bg-cyan/10 px-1.5 py-0.5 font-mono text-[0.6875rem] text-cyan">
                  {r}
                </motion.span>
              ))}
            </span>
          ) : (
            <Empty />
          )}
        </Row>
        <Row label="Duração">Automática</Row>
        <Row label="Detalhes">
          {Object.keys(d.answers).length ? `${yes.length} de ${DETAIL_QUESTIONS.length} ativados` : <Empty />}
        </Row>
        {modelo && <Row label="Modelo">{modelo.title}</Row>}
      </dl>
      {d.instructions && <p className="border-t border-line px-4 py-3 text-xs leading-relaxed text-fg-2 line-clamp-3">“{d.instructions}”</p>}
    </aside>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2.5">
      <dt className="shrink-0 text-fg-3">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-fg">{children}</dd>
    </div>
  );
}

function Empty() {
  return <span className="text-fg-3">—</span>;
}
