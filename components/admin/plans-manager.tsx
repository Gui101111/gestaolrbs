"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminSavePlanAction, type PlanInput } from "@/lib/actions/admin";
import { formatCurrency } from "@/lib/utils";
import type { Plan } from "@/types/domain";

const EMPTY: PlanInput = {
  slug: "",
  name: "",
  description: "",
  price_cents: null,
  trial_days: null,
  videos_per_month: 10,
  minutes_per_month: 60,
  max_video_duration_sec: 600,
  max_upload_mb: 2048,
  revisions_per_video: 1,
  max_resolution: "1080p",
  storage_gb: 10,
  render_priority: "standard",
  features: [],
  is_featured: false,
  is_active: true,
  is_public: true,
  sort_order: 10,
};

const num = (v: string) => (v.trim() === "" ? null : Number(v));

export function PlansManager({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<PlanInput | null>(null);
  const [pending, start] = React.useTransition();
  const [price, setPrice] = React.useState("");

  const open = (p?: Plan) => {
    const v: PlanInput = p
      ? {
          id: p.id,
          slug: p.slug,
          name: p.name,
          description: p.description,
          price_cents: p.price_cents,
          trial_days: p.trial_days,
          videos_per_month: p.videos_per_month,
          minutes_per_month: p.minutes_per_month,
          max_video_duration_sec: p.max_video_duration_sec,
          max_upload_mb: p.max_upload_mb,
          revisions_per_video: p.revisions_per_video,
          max_resolution: p.max_resolution,
          storage_gb: p.storage_gb,
          render_priority: p.render_priority as PlanInput["render_priority"],
          features: p.features,
          is_featured: p.is_featured,
          is_active: p.is_active,
          is_public: p.is_public,
          sort_order: p.sort_order,
        }
      : EMPTY;
    setEditing(v);
    setPrice(v.price_cents != null ? (v.price_cents / 100).toFixed(2).replace(".", ",") : "");
  };

  const set = <K extends keyof PlanInput>(k: K, val: PlanInput[K]) => setEditing((s) => (s ? { ...s, [k]: val } : s));

  const save = () => {
    if (!editing) return;
    const cents = price.trim() ? Math.round(Number(price.replace(/\./g, "").replace(",", ".")) * 100) : null;
    if (cents != null && Number.isNaN(cents)) return void toast.error("Preço inválido.");
    start(async () => {
      const res = await adminSavePlanAction({ ...editing, price_cents: cents });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Plano salvo.");
      setEditing(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="gold" onClick={() => open()}>
          <Plus /> Novo plano
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => (
          <div key={p.id} className="rounded-3xl border border-fg/[0.07] bg-fg/[0.02] p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-2xl text-ivory">{p.name}</p>
                <p className="font-mono text-xs text-mist">{p.slug}</p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => open(p)} aria-label={`Editar ${p.name}`}>
                <Pencil />
              </Button>
            </div>
            <p className="mt-4 font-display text-3xl text-gold-light">{p.price_cents != null && p.price_cents > 0 ? formatCurrency(p.price_cents) : "Sem preço"}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant={p.is_active ? "success" : "default"}>{p.is_active ? "Ativo" : "Inativo"}</Badge>
              <Badge variant={p.is_public ? "info" : "default"}>{p.is_public ? "Público" : "Oculto"}</Badge>
              {p.is_featured && <Badge variant="gold">Destaque</Badge>}
            </div>
            <ul className="mt-4 space-y-1 text-xs text-mist">
              <li>{p.videos_per_month ?? "∞"} vídeos/mês · {p.minutes_per_month ?? "∞"} min</li>
              <li>Até {p.max_video_duration_sec ? Math.round(p.max_video_duration_sec / 60) : "∞"} min por vídeo · upload {p.max_upload_mb} MB</li>
              <li>{p.revisions_per_video} ajustes · {p.max_resolution} · {p.render_priority}</li>
            </ul>
          </div>
        ))}
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar plano" : "Novo plano"}</DialogTitle>
            <DialogDescription>Deixe o preço vazio para exibir “Valor em breve” e desabilitar o checkout.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome">
                <Input value={editing.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="Identificador (slug)">
                <Input value={editing.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} disabled={Boolean(editing.id)} />
              </Field>
              <Field label="Descrição" className="sm:col-span-2">
                <Textarea rows={2} value={editing.description ?? ""} onChange={(e) => set("description", e.target.value)} />
              </Field>
              <Field label="Preço mensal (R$)">
                <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ex.: 297,00" />
              </Field>
              <Field label="Dias de avaliação">
                <Input inputMode="numeric" value={editing.trial_days ?? ""} onChange={(e) => set("trial_days", num(e.target.value))} />
              </Field>
              <Field label="Vídeos por mês">
                <Input inputMode="numeric" value={editing.videos_per_month ?? ""} onChange={(e) => set("videos_per_month", num(e.target.value))} />
              </Field>
              <Field label="Minutos por mês">
                <Input inputMode="numeric" value={editing.minutes_per_month ?? ""} onChange={(e) => set("minutes_per_month", num(e.target.value))} />
              </Field>
              <Field label="Duração máxima por vídeo (s)">
                <Input inputMode="numeric" value={editing.max_video_duration_sec ?? ""} onChange={(e) => set("max_video_duration_sec", num(e.target.value))} />
              </Field>
              <Field label="Upload máximo (MB)">
                <Input inputMode="numeric" value={editing.max_upload_mb} onChange={(e) => set("max_upload_mb", Number(e.target.value) || 1)} />
              </Field>
              <Field label="Ajustes por vídeo">
                <Input inputMode="numeric" value={editing.revisions_per_video} onChange={(e) => set("revisions_per_video", Number(e.target.value) || 0)} />
              </Field>
              <Field label="Resolução máxima">
                <Select value={editing.max_resolution} onValueChange={(v) => set("max_resolution", v)}>
                  <SelectTrigger aria-label="Resolução">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["720p", "1080p", "4K"].map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Armazenamento (GB)">
                <Input inputMode="numeric" value={editing.storage_gb ?? ""} onChange={(e) => set("storage_gb", num(e.target.value))} />
              </Field>
              <Field label="Velocidade de renderização">
                <Select value={editing.render_priority} onValueChange={(v) => set("render_priority", v as PlanInput["render_priority"])}>
                  <SelectTrigger aria-label="Prioridade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Padrão</SelectItem>
                    <SelectItem value="priority">Prioritária</SelectItem>
                    <SelectItem value="express">Expressa</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Ordem">
                <Input inputMode="numeric" value={editing.sort_order} onChange={(e) => set("sort_order", Number(e.target.value) || 0)} />
              </Field>
              <Field label="Benefícios (um por linha)" className="sm:col-span-2">
                <Textarea rows={4} value={editing.features?.join("\n") ?? ""} onChange={(e) => set("features", e.target.value.split("\n").map((l) => l.trim()).filter(Boolean))} />
              </Field>
              <div className="flex flex-wrap gap-6 sm:col-span-2">
                {(
                  [
                    ["is_active", "Ativo"],
                    ["is_public", "Visível na landing"],
                    ["is_featured", "Destaque"],
                  ] as const
                ).map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 text-sm text-ivory/90">
                    <Switch checked={editing[k]} onCheckedChange={(v) => set(k, v)} /> {label}
                  </label>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button variant="gold" onClick={save} loading={pending}>
              Salvar plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
