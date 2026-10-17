"use client";

import { TimeAgo } from "@/components/shared/time-ago";
import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronsLeft, FolderPlus, LayoutTemplate, Plus } from "lucide-react";
import { FolderTree } from "@/components/folders/folder-tree";
import { FolderDialog } from "@/components/folders/folder-dialog";
import { SETTINGS_TABS, sectionOf, type FolderItem, type RecentItem } from "@/components/app-shell/nav";
import { StatusBadge } from "@/components/projects/status-badge";
import { comoFazer } from "@/content/como-fazer";
import { landing } from "@/content/landing";
import { ASPECT_RATIOS, EDITING_STYLES, LEGAL_AREAS } from "@/lib/constants/domain";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Painel secundário (248px): muda conforme o item do rail. */
export function SidePanel({
  recents,
  folders,
  onCollapse,
  onNavigate,
  className,
}: {
  recents: RecentItem[];
  folders: FolderItem[];
  onCollapse?: () => void;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const section = sectionOf(pathname);
  const [folderOpen, setFolderOpen] = React.useState(false);
  const currentFolder = pathname.startsWith("/app/projetos/") ? pathname.split("/")[3] : null;
  const newVideoHref = currentFolder ? `${ROUTES.newVideo}?pasta=${currentFolder}` : ROUTES.newVideo;

  const showCreate = section !== "exemplos" && section !== "como-fazer" && section !== "configuracoes";

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex items-center justify-between px-4 pt-5 pb-2">
        <p className="text-sm font-bold text-fg">{titleOf(section)}</p>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Recolher painel"
            className="grid size-8 place-items-center rounded-lg text-fg-3 transition hover:bg-fg/[0.06] hover:text-fg"
          >
            <ChevronsLeft className="size-4" />
          </button>
        )}
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-2.5 pb-6" data-lenis-prevent>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={section}
            initial={{ opacity: 0, x: -8, filter: "blur(4px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: 8, filter: "blur(4px)" }}
            transition={{ duration: 0.3, ease: EASE }}
            className="space-y-6"
          >
            {showCreate && (
              <PanelGroup title="Criar">
                <PanelLink href={newVideoHref} icon={Plus} onClick={onNavigate} accent>
                  Novo vídeo
                </PanelLink>
                <button
                  type="button"
                  onClick={() => setFolderOpen(true)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-fg-2 transition hover:bg-fg/[0.05] hover:text-fg"
                >
                  <FolderPlus className="size-4" /> Nova pasta
                </button>
                <PanelLink href={`${ROUTES.app}#modelos`} icon={LayoutTemplate} onClick={onNavigate}>
                  Usar um modelo
                </PanelLink>
              </PanelGroup>
            )}

            {section === "projetos" && (
              <PanelGroup title="Pastas" action={{ label: "Todos", href: ROUTES.projects }}>
                <FolderTree folders={folders} onNavigate={onNavigate} />
              </PanelGroup>
            )}

            {(section === "inicio" || section === "projetos" || section === "marca" || section === "assinatura") && (
              <PanelGroup title="Recentes" action={{ label: "Ver tudo", href: ROUTES.projects }}>
                {recents.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-fg-3">Seus vídeos aparecem aqui.</p>
                ) : (
                  recents.map((r) => (
                    <Link
                      key={r.id}
                      href={r.status === "draft" ? `${ROUTES.newVideo}?id=${r.id}` : ROUTES.video(r.id)}
                      onClick={onNavigate}
                      className={cn(
                        "block rounded-xl px-3 py-2 transition hover:bg-fg/[0.05]",
                        pathname === ROUTES.video(r.id) && "bg-fg/[0.06]",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{r.name}</span>
                        <StatusBadge status={r.status} className="px-1.5 py-0.5 text-[0.5625rem] [&_svg]:hidden" />
                      </span>
                      <span className="mt-0.5 block text-xs text-fg-3"><TimeAgo value={r.updated_at} /></span>
                    </Link>
                  ))
                )}
              </PanelGroup>
            )}

            {section === "exemplos" && (
              <React.Suspense>
                <ExampleFilters onNavigate={onNavigate} />
              </React.Suspense>
            )}

            {section === "como-fazer" && (
              <PanelGroup title="Tópicos">
                {comoFazer.map((a) => (
                  <PanelLink key={a.id} href={`${ROUTES.howTo}#${a.id}`} onClick={onNavigate}>
                    {a.title}
                  </PanelLink>
                ))}
                <PanelLink href={`${ROUTES.howTo}#duvidas`} onClick={onNavigate}>
                  Dúvidas
                </PanelLink>
              </PanelGroup>
            )}

            {section === "configuracoes" && (
              <React.Suspense>
                <SettingsLinks onNavigate={onNavigate} />
              </React.Suspense>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <FolderDialog open={folderOpen} onOpenChange={setFolderOpen} parentId={currentFolder} />
    </div>
  );
}

function titleOf(section: string) {
  switch (section) {
    case "projetos":
      return "Projetos";
    case "exemplos":
      return "Exemplos";
    case "marca":
      return "Marca";
    case "como-fazer":
      return "Como fazer";
    case "assinatura":
      return "Assinatura";
    case "configuracoes":
      return "Configurações";
    default:
      return "Início";
  }
}

function PanelGroup({ title, action, children }: { title: string; action?: { label: string; href: string }; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between px-3 pb-1.5">
        <h2 className="font-sans text-[0.6875rem] font-bold tracking-[0.14em] text-fg-3 uppercase">{title}</h2>
        {action && (
          <Link href={action.href} className="text-xs font-medium text-fg-3 transition hover:text-cyan">
            {action.label} ›
          </Link>
        )}
      </div>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function PanelLink({
  href,
  icon: Icon,
  children,
  onClick,
  accent,
  active,
}: {
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick?: () => void;
  accent?: boolean;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition",
        active ? "bg-cyan/[0.08] text-fg" : "text-fg-2 hover:bg-fg/[0.05] hover:text-fg",
        accent && "font-semibold text-fg",
      )}
    >
      {Icon && (
        <span
          className={cn(
            "grid size-6 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-110",
            accent ? "bg-gold text-[#1a1306] shadow-[0_0_12px_-2px_var(--gold)]" : "",
          )}
        >
          <Icon className="size-4" />
        </span>
      )}
      {children}
    </Link>
  );
}

function ExampleFilters({ onNavigate }: { onNavigate?: () => void }) {
  const params = useSearchParams();
  const href = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || next.get(key) === value) next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    return `${ROUTES.examples}${qs ? `?${qs}` : ""}`;
  };
  const groups = [
    { key: "estilo", title: "Estilo", items: EDITING_STYLES.map((s) => ({ value: s.value, label: landing.styleNames[s.value] ?? s.label })) },
    { key: "formato", title: "Formato", items: ASPECT_RATIOS.map((r) => ({ value: r.value, label: r.value })) },
    {
      key: "area",
      title: "Área do Direito",
      items: LEGAL_AREAS.filter((a) => a.value !== "outro").map((a) => ({ value: a.value, label: a.label })),
    },
  ];
  return (
    <>
      {groups.map((g) => (
        <PanelGroup key={g.key} title={g.title}>
          <div className="flex flex-wrap gap-1.5 px-2">
            {g.items.map((it) => {
              const active = params.get(g.key) === it.value;
              return (
                <Link
                  key={it.value}
                  href={href(g.key, it.value)}
                  onClick={onNavigate}
                  scroll={false}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                    active ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-line text-fg-2 hover:border-line-strong hover:text-fg",
                  )}
                >
                  {it.label}
                </Link>
              );
            })}
          </div>
        </PanelGroup>
      ))}
    </>
  );
}

function SettingsLinks({ onNavigate }: { onNavigate?: () => void }) {
  const params = useSearchParams();
  const current = params.get("aba") ?? "conta";
  return (
    <PanelGroup title="Seções">
      {SETTINGS_TABS.map((t) => (
        <PanelLink key={t.value} href={`${ROUTES.settings}?aba=${t.value}`} onClick={onNavigate} active={current === t.value}>
          {t.label}
        </PanelLink>
      ))}
    </PanelGroup>
  );
}
