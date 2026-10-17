"use client";

import * as React from "react";
import { Folder, FolderRoot, Lightbulb } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VideoUploader, type UploadedVideo } from "@/components/upload/video-uploader";
import { buildFolderTree, folderColor, type FolderNode } from "@/components/folders/folder-colors";
import { useFolders } from "@/components/folders/folders-context";
import type { FolderItem } from "@/components/app-shell/nav";
import { LEGAL_AREAS } from "@/lib/constants/domain";
import { cn } from "@/lib/utils";
import type { Draft, DraftVideo } from "@/components/new-video/types";

export function StepSend({
  d,
  update,
  video,
  limits,
  tip,
  ensurePath,
  onUploaded,
  onRemove,
}: {
  d: Draft;
  update: (patch: Partial<Draft>) => void;
  video: DraftVideo | null;
  limits: { maxBytes: number; maxDurationSec: number | null };
  tip: string | null;
  ensurePath: (file: File) => Promise<string | null>;
  onUploaded: (v: UploadedVideo) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const folders = useFolders();
  const flat = React.useMemo(() => {
    const out: FolderNode<FolderItem>[] = [];
    const walk = (nodes: FolderNode<FolderItem>[]) => nodes.forEach((n) => (out.push(n), walk(n.children)));
    walk(buildFolderTree(folders));
    return out;
  }, [folders]);

  return (
    <div className="space-y-7">
      {tip && (
        <p className="glass flex items-start gap-3 rounded-2xl px-4 py-3 text-sm text-fg">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-gold" />
          <span>
            <span className="font-semibold">Dica de gravação: </span>
            {tip}
          </span>
        </p>
      )}

      <VideoUploader
        existing={video}
        maxBytes={limits.maxBytes}
        maxDurationSec={limits.maxDurationSec}
        ensurePath={ensurePath}
        onUploaded={onUploaded}
        onRemove={onRemove}
      />

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Título" htmlFor="video-name" hint="Preenchido pelo nome do arquivo.">
          <Input
            id="video-name"
            value={d.name}
            maxLength={140}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Ex.: Revisão da aposentadoria"
          />
        </Field>
        <Field label="Pasta" htmlFor="video-folder">
          <Select value={d.folder_id ?? "root"} onValueChange={(v) => update({ folder_id: v === "root" ? null : v })}>
            <SelectTrigger id="video-folder">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="root">
                <span className="flex items-center gap-2">
                  <FolderRoot className="size-4 text-fg-3" /> Projetos (sem pasta)
                </span>
              </SelectItem>
              {flat.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  <span className="flex items-center gap-2" style={{ paddingLeft: (f.depth - 1) * 14 }}>
                    <Folder className="size-4" style={{ color: folderColor(f.color) }} /> {f.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <fieldset>
        <legend className="mb-3 text-[0.8125rem] font-medium text-fg">Área do Direito</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Área do Direito">
          {LEGAL_AREAS.map((a) => {
            const active = d.legal_area === a.value;
            return (
              <button
                key={a.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => update({ legal_area: a.value })}
                className={cn(
                  "rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-300",
                  active ? "border-cyan/60 bg-cyan/10 text-cyan shadow-[var(--glow-cyan)]" : "border-line text-fg-2 hover:border-line-strong hover:text-fg",
                )}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
