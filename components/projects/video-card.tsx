"use client";

import { TimeAgo } from "@/components/shared/time-ago";
import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Check, Clapperboard, Play } from "lucide-react";
import { StatusBadge } from "@/components/projects/status-badge";
import { ProjectActionsMenu, ProjectContextMenu } from "@/components/projects/project-actions";
import { onSpotlightMove } from "@/components/effects/spotlight";
import { ProgressRing } from "@/components/effects/progress-ring";
import { EDITING_STATUSES, PIPELINE_STEPS } from "@/lib/constants/domain";
import { ROUTES } from "@/lib/routes";
import { cn, formatDuration } from "@/lib/utils";
import type { ProjectListItem } from "@/services/projects/queries";
import { useTilt } from "@/components/effects/use-tilt";

export const DRAG_MIME = "application/x-tribuna-videos";

export function VideoCard({
  project,
  index = 0,
  selectable = false,
  selected = false,
  onToggleSelect,
  draggable = false,
  dragIds,
  layout = "grid",
}: {
  project: ProjectListItem;
  index?: number;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string, additive: boolean) => void;
  draggable?: boolean;
  /** Ids arrastados juntos (seleção múltipla). */
  dragIds?: string[];
  layout?: "grid" | "list";
}) {
  const href = project.status === "draft" ? `${ROUTES.newVideo}?id=${project.id}` : ROUTES.video(project.id);
  const editing = (EDITING_STATUSES as readonly string[]).includes(project.status);
  const done = project.status === "ready" || project.status === "completed";
  const tilt = useTilt();
  const step = PIPELINE_STEPS.find((s) => s.value === project.job?.current_step);
  const progress = project.job?.progress ?? 0;

  const dragProps = draggable
    ? {
        draggable: true,
        onDragStart: (e: React.DragEvent) => {
          const ids = dragIds?.includes(project.id) ? dragIds : [project.id];
          e.dataTransfer.setData(DRAG_MIME, JSON.stringify(ids));
          e.dataTransfer.effectAllowed = "move";
        },
      }
    : {};

  if (layout === "list") {
    return (
      <ProjectContextMenu id={project.id} name={project.name} status={project.status} canDownload={done} folderId={project.folder_id}>
      <div
        {...dragProps}
        className={cn(
          "group relative flex items-center gap-4 rounded-2xl border px-3 py-2.5 transition-all duration-300",
          selected ? "border-cyan/50 bg-cyan/[0.06]" : "border-line bg-fg/[0.02] hover:border-line-strong",
        )}
      >
        {selectable && <SelectBox selected={selected} onToggle={(add) => onToggleSelect?.(project.id, add)} className="relative" />}
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-4">
          <span className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-xl bg-raised">
            {project.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={project.thumbnail_url} alt="" loading="lazy" className="size-full object-cover" />
            ) : (
              <Clapperboard className="absolute top-1/2 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-fg-3" />
            )}
            {editing && <span className="scanline" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-fg">{project.name}</span>
            <span className="mt-0.5 block truncate text-xs text-fg-3">
              <TimeAgo value={project.updated_at} /> · {formatDuration(project.source_duration_sec)}
            </span>
          </span>
          <span className="hidden gap-1 md:flex">
            {project.aspect_ratios.map((r) => (
              <span key={r} className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[0.625rem] text-fg-2">
                {r}
              </span>
            ))}
          </span>
          <StatusBadge status={project.status} />
        </Link>
        <ProjectActionsMenu id={project.id} name={project.name} status={project.status} canDownload={done} folderId={project.folder_id} />
      </div>
      </ProjectContextMenu>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.05, 0.4), ease: [0.22, 1, 0.36, 1] }}
      style={tilt.style}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
      className="h-full"
    >
      <ProjectContextMenu id={project.id} name={project.name} status={project.status} canDownload={done} folderId={project.folder_id}>
      <div
        {...dragProps}
        onPointerMove={onSpotlightMove}
        className={cn(
          "spotlight sheen group relative h-full overflow-hidden rounded-[20px] border bg-surface/70 transition-all duration-500 ease-[var(--ease-luxe)] hover:-translate-y-1 hover:shadow-[var(--shadow-pop)]",
          selected ? "border-cyan/60 shadow-[var(--glow-cyan)]" : "border-line",
        )}
      >
        <span aria-hidden className="sheen-layer" />
        <Link href={href} className="block" aria-label={`Abrir ${project.name}`}>
          <div className="theme-stage relative aspect-[16/10] overflow-hidden bg-raised">
            {project.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.thumbnail_url}
                alt=""
                loading="lazy"
                className="size-full object-cover transition-transform duration-[1.4s] ease-[var(--ease-luxe)] group-hover:scale-[1.05]"
              />
            ) : (
              <div className="grid h-full place-items-center bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--cyan)_14%,transparent),transparent_70%)]">
                <Clapperboard className="size-8 text-fg-3" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            {editing && <span className="scanline" />}
            <div className="absolute top-3 left-3">
              <StatusBadge status={project.status} className="bg-black/50 backdrop-blur" />
            </div>
            {editing && (
              <div className="absolute right-3 bottom-3">
                <ProgressRing value={progress} />
              </div>
            )}
            {done && (
              <span className="absolute top-1/2 left-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 scale-90 place-items-center rounded-full bg-gold/90 text-[#1a1306] opacity-0 shadow-[0_0_30px_var(--gold)] transition-all duration-500 group-hover:scale-100 group-hover:opacity-100">
                <Play className="size-5 fill-current" />
              </span>
            )}
            <div className="absolute bottom-3 left-3 flex gap-1">
              {project.aspect_ratios.map((r) => (
                <span key={r} className="rounded-md bg-black/55 px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-white backdrop-blur">
                  {r}
                </span>
              ))}
              {project.source_duration_sec ? (
                <span className="rounded-md bg-black/55 px-1.5 py-0.5 font-mono text-[0.625rem] text-white/85 backdrop-blur">
                  {formatDuration(project.source_duration_sec)}
                </span>
              ) : null}
            </div>
          </div>
          <div className="p-4">
            <h3 className="truncate pr-8 font-sans text-[0.9375rem] font-semibold tracking-normal text-fg">{project.name}</h3>
            <p className="mt-1 truncate text-xs text-fg-3">{editing && step ? step.label : <TimeAgo value={project.updated_at} />}</p>
          </div>
        </Link>
        {selectable && <SelectBox selected={selected} onToggle={(add) => onToggleSelect?.(project.id, add)} className="absolute top-4 right-14" />}
        {/* Sempre visível: no toque não existe hover, e o menu é o caminho para Excluir */}
        <div className="absolute top-3 right-3">
          <ProjectActionsMenu id={project.id} name={project.name} status={project.status} canDownload={done} folderId={project.folder_id} />
        </div>
      </div>
      </ProjectContextMenu>
    </motion.article>
  );
}

function SelectBox({ selected, onToggle, className }: { selected: boolean; onToggle: (additive: boolean) => void; className?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={selected ? "Desmarcar" : "Selecionar"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle(true);
      }}
      className={cn(
        "z-10 grid size-7 place-items-center rounded-lg border transition-all duration-300",
        selected
          ? "border-cyan bg-cyan text-[#06222a] shadow-[var(--glow-cyan)]"
          : "border-white/50 bg-black/35 text-transparent backdrop-blur pointer-fine:md:opacity-0 pointer-fine:md:group-hover:opacity-100 pointer-fine:md:focus-visible:opacity-100",
        className,
      )}
    >
      <Check className="size-4" strokeWidth={3} />
    </button>
  );
}

export function VideoCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[20px] border border-line">
      <div className="skeleton aspect-[16/10]" />
      <div className="space-y-2 p-4">
        <div className="skeleton h-4 w-2/3 rounded-md" />
        <div className="skeleton h-3 w-1/3 rounded-md" />
      </div>
    </div>
  );
}
