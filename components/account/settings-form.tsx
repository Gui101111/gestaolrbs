"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Moon, Save, Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { panelClass, panelTitle } from "@/components/account/profile-form";
import { useTheme, type Theme } from "@/components/theme/theme-provider";
import { savePreferencesAction } from "@/lib/actions/profile";
import { EDITING_STYLES } from "@/lib/constants/domain";
import { cn } from "@/lib/utils";

export type PreferenceValues = { defaultEditingStyle: string; defaultPlatforms: string[]; emailNotifications: boolean; productNews: boolean };

function useSavePrefs(initial: PreferenceValues) {
  const router = useRouter();
  const [v, setV] = React.useState(initial);
  const [pending, start] = React.useTransition();
  const save = (next?: PreferenceValues) =>
    start(async () => {
      const res = await savePreferencesAction(next ?? v);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Preferências salvas.");
      router.refresh();
    });
  return { v, setV, pending, save };
}

/** Padrão do Novo vídeo (aba Conta). */
export function DefaultsPanel({ initial }: { initial: PreferenceValues }) {
  const { v, setV, pending, save } = useSavePrefs(initial);
  return (
    <div className={panelClass}>
      <h2 className={panelTitle}>Padrão do novo vídeo</h2>
      <p className="mt-1 text-sm text-fg-3">Pré-selecionado ao criar um vídeo.</p>
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <Field label="Estilo de edição" className="w-full max-w-xs">
          <Select value={v.defaultEditingStyle || undefined} onValueChange={(val) => setV((s) => ({ ...s, defaultEditingStyle: val }))}>
            <SelectTrigger aria-label="Estilo padrão">
              <SelectValue placeholder="Sem padrão" />
            </SelectTrigger>
            <SelectContent>
              {EDITING_STYLES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Button variant="subtle" onClick={() => save()} loading={pending}>
          {!pending && <Save />} Salvar
        </Button>
      </div>
    </div>
  );
}

/** Notificações por e-mail. */
export function NotificationsPanel({ initial }: { initial: PreferenceValues }) {
  const { v, setV, pending, save } = useSavePrefs(initial);
  return (
    <div className={panelClass}>
      <h2 className={panelTitle}>Notificações</h2>
      <div className="mt-3 divide-y divide-line">
        {(
          [
            ["emailNotifications", "E-mails sobre meus vídeos", "Recebido, pronto e ajustes concluídos."],
            ["productNews", "Novidades da plataforma", "No máximo uma vez por mês."],
          ] as const
        ).map(([key, label, desc]) => (
          <label key={key} className="flex cursor-pointer items-center justify-between gap-4 py-4">
            <span>
              <span className="block text-sm font-semibold text-fg">{label}</span>
              <span className="block text-xs text-fg-3">{desc}</span>
            </span>
            <Switch checked={v[key]} onCheckedChange={(c) => setV((s) => ({ ...s, [key]: c }))} aria-label={label} />
          </label>
        ))}
      </div>
      <div className="mt-2 flex justify-end">
        <Button variant="gold" onClick={() => save()} loading={pending}>
          {!pending && <Save />} Salvar
        </Button>
      </div>
    </div>
  );
}

const THEMES: { value: Theme; label: string; text: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "grafite", label: "Grafite", text: "Metal escuro com neon.", icon: Moon },
  { value: "claro", label: "Claro", text: "Metal claro, vidro branco.", icon: Sun },
];

/** Aparência: tema Grafite ou Claro (vale para este navegador). */
export function AppearancePanel() {
  const { theme, setTheme } = useTheme();
  return (
    <div className={panelClass}>
      <h2 className={panelTitle}>Aparência</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Tema">
        {THEMES.map((t) => {
          const on = theme === t.value;
          return (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setTheme(t.value)}
              className={cn(
                "group relative overflow-hidden rounded-[20px] p-2 text-left transition-all duration-500",
                on ? "neon-border bg-surface" : "border border-line hover:border-line-strong",
              )}
            >
              <span
                className={cn("block aspect-[16/9] overflow-hidden rounded-[14px] border border-black/10", t.value === "claro" ? "bg-[#eef0f3]" : "bg-[#1a1d22]")}
                aria-hidden
              >
                <span className={cn("flex h-full", t.value === "claro" ? "bg-[#eef0f3]" : "bg-[#1a1d22]")}>
                  <span className={cn("h-full w-[14%]", t.value === "claro" ? "bg-white/80" : "bg-[#22262c]")} />
                  <span className="flex-1 p-3">
                    <span className={cn("block h-2.5 w-1/2 rounded-full", t.value === "claro" ? "bg-[#14171c]" : "bg-white")} />
                    <span className="mt-2 block h-1.5 w-1/3 rounded-full bg-[linear-gradient(90deg,#3be3f0,#7fa8ff,#f2c46d)]" />
                    <span className="mt-3 grid grid-cols-3 gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className={cn("h-6 rounded-md", t.value === "claro" ? "bg-white shadow-sm" : "bg-[#2c3138]")} />
                      ))}
                    </span>
                  </span>
                </span>
              </span>
              <span className="flex items-center justify-between px-1.5 pt-2.5 pb-1">
                <span className="flex items-center gap-2 text-sm font-bold text-fg">
                  <t.icon className="size-4 text-cyan" /> {t.label}
                </span>
                {on && (
                  <span className="grid size-5 place-items-center rounded-full bg-cyan text-[#06222a]">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className="block px-1.5 pb-1 text-xs text-fg-3">{t.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
