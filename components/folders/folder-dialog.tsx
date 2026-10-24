"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FOLDER_COLORS } from "@/components/folders/folder-colors";
import { createFolderAction, updateFolderAction } from "@/lib/actions/folders";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

/** Criar ou renomear/colorir uma pasta. */
export function FolderDialog({
  open,
  onOpenChange,
  parentId = null,
  folder,
  navigate = true,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  parentId?: string | null;
  folder?: { id: string; name: string; color: string };
  navigate?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(folder?.name ?? "");
  const [color, setColor] = React.useState(folder?.color ?? "gold");
  const [error, setError] = React.useState<string | undefined>();
  const [pending, start] = React.useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      const res = folder
        ? await updateFolderAction(folder.id, { name, color })
        : await createFolderAction({ name, color, parentId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success(folder ? "Pasta atualizada." : "Pasta criada.");
      onOpenChange(false);
      if (!folder) {
        setName("");
        if (navigate && res.data) router.push(ROUTES.folder(res.data.id));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{folder ? "Editar pasta" : "Nova pasta"}</DialogTitle>
            <DialogDescription>{folder ? "Nome e cor." : "Organize seus vídeos por tema, cliente ou campanha."}</DialogDescription>
          </DialogHeader>
          <Field label="Nome" htmlFor="folder-name" error={error}>
            <Input
              id="folder-name"
              autoFocus
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Previdenciário"
              aria-invalid={Boolean(error)}
            />
          </Field>
          <fieldset>
            <legend className="mb-2 text-[0.8125rem] font-medium text-fg">Cor</legend>
            <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Cor da pasta">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={color === c.value}
                  aria-label={c.label}
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "grid size-9 place-items-center rounded-full border-2 transition-all duration-300",
                    color === c.value ? "scale-110 border-fg" : "border-transparent hover:scale-105",
                  )}
                  style={{ background: c.css, boxShadow: color === c.value ? `0 0 16px -2px ${c.css}` : undefined }}
                >
                  {color === c.value && <Check className="size-4 text-[#14171c]" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="gold" loading={pending}>
              {folder ? "Salvar" : "Criar pasta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
