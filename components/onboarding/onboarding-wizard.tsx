"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Briefcase, Megaphone, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OptionCard } from "@/components/projects/option-card";
import { BRAZIL_UFS, LEGAL_AREAS, PROFILE_GOALS } from "@/lib/constants/domain";
import { completeOnboardingAction } from "@/lib/actions/profile";
import type { OnboardingInput } from "@/lib/validations/profile";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";

const STEPS = [
  { title: "Como devemos chamar você?", subtitle: "Esses dados aparecem nos seus vídeos quando você quiser.", icon: Briefcase },
  { title: "Qual é a sua área principal?", subtitle: "Usamos isso para contextualizar B-roll, termos e destaques.", icon: Sparkles },
  { title: "Para que serão seus vídeos?", subtitle: "Isso define os padrões sugeridos em cada novo projeto.", icon: Megaphone },
];

type State = {
  treatment: "" | "dr" | "dra";
  fullName: string;
  officeName: string;
  oabNumber: string;
  oabUf: string;
  legalArea: string;
  mainGoal: string;
};

export function OnboardingWizard({ defaults }: { defaults: Partial<State> }) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [dir, setDir] = React.useState(1);
  const [pending, start] = React.useTransition();
  const [errors, setErrors] = React.useState<Partial<Record<keyof State, string>>>({});
  const [state, setState] = React.useState<State>({
    treatment: defaults.treatment ?? "",
    fullName: defaults.fullName ?? "",
    officeName: defaults.officeName ?? "",
    oabNumber: defaults.oabNumber ?? "",
    oabUf: defaults.oabUf ?? "",
    legalArea: "",
    mainGoal: "",
  });
  const set = <K extends keyof State>(k: K, v: State[K]) => {
    setState((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    if (step === 0 && state.fullName.trim().length < 2) {
      setErrors({ fullName: "Informe seu nome completo." });
      return false;
    }
    if (step === 0 && state.oabNumber && !state.oabUf) {
      setErrors({ oabUf: "Selecione a seccional." });
      return false;
    }
    if (step === 1 && !state.legalArea) {
      setErrors({ legalArea: "Escolha uma área para continuar." });
      return false;
    }
    if (step === 2 && !state.mainGoal) {
      setErrors({ mainGoal: "Escolha um objetivo para continuar." });
      return false;
    }
    return true;
  };

  const next = () => {
    if (!validate()) return;
    if (step < STEPS.length - 1) {
      setDir(1);
      setStep((s) => s + 1);
      return;
    }
    start(async () => {
      const res = await completeOnboardingAction(state as OnboardingInput);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Tudo pronto. Bem-vindo(a) à TRIBUNA!");
      router.replace(ROUTES.app);
      router.refresh();
    });
  };

  const back = () => {
    setDir(-1);
    setStep((s) => Math.max(0, s - 1));
  };

  const Icon = STEPS[step].icon;

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-8 flex items-center gap-3">
        {STEPS.map((_, i) => (
          <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-fg/[0.07]">
            <motion.div
              className="h-full bg-brand-gradient"
              initial={false}
              animate={{ width: i < step ? "100%" : i === step ? "50%" : "0%" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        ))}
        <span className="text-xs text-fg-3 tabular-nums">
          {step + 1}/{STEPS.length}
        </span>
      </div>

      <div className="glass-strong relative overflow-hidden rounded-[28px] p-6 shadow-[var(--shadow-pop)] md:p-10">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40, filter: "blur(8px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: dir * -40, filter: "blur(8px)" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="grid size-12 place-items-center rounded-2xl border border-cyan/30 bg-cyan/10 text-cyan">
              <Icon className="size-5" />
            </span>
            <h1 className="mt-6 text-3xl leading-tight text-fg md:text-4xl">{STEPS[step].title}</h1>
            <p className="mt-2 text-sm text-fg-2">{STEPS[step].subtitle}</p>

            <div className="mt-8">
              {step === 0 && (
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <p className="mb-2 text-sm font-medium text-fg">Tratamento</p>
                    <div className="flex gap-2" role="radiogroup" aria-label="Tratamento">
                      {(
                        [
                          ["dr", "Dr."],
                          ["dra", "Dra."],
                          ["", "Prefiro não usar"],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value || "none"}
                          type="button"
                          role="radio"
                          aria-checked={state.treatment === value}
                          onClick={() => set("treatment", value)}
                          className={cn(
                            "rounded-full border px-4 py-2 text-sm font-semibold transition",
                            state.treatment === value ? "border-cyan/60 bg-cyan/10 text-fg" : "border-line text-fg-2 hover:border-line-strong hover:text-fg",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Field label="Nome completo" htmlFor="fullName" error={errors.fullName} className="md:col-span-2">
                    <Input id="fullName" value={state.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Ana Souza" autoComplete="name" aria-invalid={!!errors.fullName} />
                  </Field>
                  <Field label="Nome do escritório" htmlFor="officeName" optional className="md:col-span-2">
                    <Input id="officeName" value={state.officeName} onChange={(e) => set("officeName", e.target.value)} placeholder="Souza Advocacia" autoComplete="organization" />
                  </Field>
                  <Field label="Número da OAB" htmlFor="oab" optional>
                    <Input id="oab" inputMode="numeric" value={state.oabNumber} onChange={(e) => set("oabNumber", e.target.value)} placeholder="123.456" />
                  </Field>
                  <Field label="Seccional" error={errors.oabUf} optional={!state.oabNumber}>
                    <Select value={state.oabUf} onValueChange={(v) => set("oabUf", v)}>
                      <SelectTrigger aria-invalid={!!errors.oabUf} aria-label="Seccional da OAB">
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent>
                        {BRAZIL_UFS.map((uf) => (
                          <SelectItem key={uf} value={uf}>
                            {uf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              )}

              {step === 1 && (
                <div role="radiogroup" aria-label="Área principal" className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {LEGAL_AREAS.filter((a) => !["tributario", "imobiliario"].includes(a.value)).map((a) => (
                    <OptionCard key={a.value} selected={state.legalArea === a.value} onSelect={() => set("legalArea", a.value)} title={a.label} className="min-h-16 justify-center" />
                  ))}
                </div>
              )}

              {step === 2 && (
                <div role="radiogroup" aria-label="Objetivo principal" className="grid gap-3 sm:grid-cols-2">
                  {PROFILE_GOALS.map((g) => (
                    <OptionCard key={g.value} selected={state.mainGoal === g.value} onSelect={() => set("mainGoal", g.value)} title={g.label} />
                  ))}
                </div>
              )}
              {(errors.legalArea || errors.mainGoal) && (
                <p role="alert" className="mt-4 text-[0.8125rem] text-destructive">
                  {errors.legalArea ?? errors.mainGoal}
                </p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className={cn("mt-10 flex items-center gap-3", step === 0 ? "justify-end" : "justify-between")}>
          {step > 0 && (
            <Button variant="ghost" onClick={back} disabled={pending}>
              <ArrowLeft /> Voltar
            </Button>
          )}
          <Button variant="gold" size="lg" onClick={next} loading={pending}>
            {step === STEPS.length - 1 ? "Concluir" : "Continuar"} {!pending && <ArrowRight />}
          </Button>
        </div>
      </div>
    </div>
  );
}
