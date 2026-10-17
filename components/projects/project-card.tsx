"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Clapperboard, Play } from "lucide-react";
import { StatusBadge } from "@/components/projects/status-badge";
import { ProjectActionsMenu } from "@/components/projects/project-actions";
import { Progress } from "@/components/ui/progress";
import { EDITING_STYLES, PIPELINE_STEPS, labelOf } from "@/lib/constants/domain";
import { cn, formatDate, formatDuration } from "@/lib/utils";
import type { ProjectListItem } from "@/services/projects/queries";

export function ProjectCard({ project, index = 0 }: { project: ProjectListItem; index?: number }) {
  const href = project.status === "draft" ? `/app/novo?id=${project.id}` : `/app/video/${project.id}`;
  const inFlight = ["queued", "processing", "revision_requested"].includes(project.status);
  const done = project.status === "ready" || project.status === "completed";
  const step = PIPELINE_STEPS.find((s) => s.value === project.job?.current_step);

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: Math.min(index * 0.06, 0.4), ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-2xl border border-fg/[0.07] bg-fg/[0.02] transition-all duration-700 ease-[var(--ease-luxe)] hover:-translate-y-1 hover:border-gold/30 hover:shadow-[0_30px_60px_-35px_rgba(198,161,91,0.55)]"
    >
      <Link href={href} className="block" aria-label={`Abrir ${project.name}`}>
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-navy-deep to-ink">
          {project.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.thumbnail_url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-[1.4s] ease-[var(--ease-luxe)] group-hover:scale-[1.05]"
            />
          ) : (
            <div className="grid h-full place-items-center">
              <Clapperboard className="size-8 text-gold/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent" />
          <div className="absolute top-3 left-3">
            <StatusBadge status={project.status} className="bg-ink/70 backdrop-blur" />
          </div>
          {done && (
            <span className="absolute top-1/2 left-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 scale-90 place-items-center rounded-full bg-gold/90 text-on-gold opacity-0 shadow-[0_0_30px_rgba(198,161,91,0.7)] transition-all duration-500 group-hover:scale-100 group-hover:opacity-100">
              <Play className="size-5 fill-current" />
            </span>
          )}
          <div className="absolute right-3 bottom-3 left-3 flex items-center justify-between text-[0.6875rem] text-ivory/80">
            <span className="rounded-md bg-black/50 px-1.5 py-0.5 font-mono backdrop-blur">{project.aspect_ratios.join(" · ") || "—"}</span>
            <span className="rounded-md bg-black/50 px-1.5 py-0.5 font-mono backdrop-blur">{formatDuration(project.source_duration_sec)}</span>
          </div>
        </div>
        <div className="p-4">
          <h3 className="truncate pr-10 font-medium text-ivory">{project.name}</h3>
          <p className="mt-1 truncate text-xs text-mist">
            {formatDate(project.updated_at)} · {labelOf(EDITING_STYLES, project.editing_style)}
          </p>
          {inFlight && (
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-[0.6875rem]">
                <span className="truncate text-gold-light">{step?.label ?? "Na fila"}</span>
                <span className="text-mist tabular-nums">{project.job?.progress ?? 0}%</span>
              </div>
              <Progress value={project.job?.progress ?? 0} />
            </div>
          )}
        </div>
      </Link>
      <div className={cn("absolute top-3 right-3 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100")}>
        <ProjectActionsMenu id={project.id} name={project.name} status={project.status} canDownload={done} />
      </div>
    </motion.article>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-fg/[0.06]">
      <div className="skeleton aspect-[16/10]" />
      <div className="space-y-2 p-4">
        <div className="skeleton h-4 w-2/3 rounded-md" />
        <div className="skeleton h-3 w-1/3 rounded-md" />
      </div>
    </div>
  );
}
