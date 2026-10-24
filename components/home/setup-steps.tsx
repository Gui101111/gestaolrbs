"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Download, Lock, Palette, Sparkles, UserRoundCheck, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DrawCheck } from "@/components/effects/draw-check";
import { Aurora } from "@/components/effects/aurora";
import { setUiPreferencesAction } from "@/lib/actions/profile";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/animations/count-up";

export type SetupStep = {
  id: string;
  title: string;
  text: string;
  done: boolean;
  unlockAfter: number | null;
  href: string;
  cta: string;
};

const ICONS = [UserRoundCheck, Palette, Video, Download];

/** "Conclua sua configuração · n/4": etapas com bloqueio progressivo, vindas dos dados reais. */
export function SetupSteps({ steps }: { steps: SetupStep[] }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const doneCount = steps.filter((s) => s.done).length;
  const all = doneCount === steps.length;
  const unlocked = (s: SetupStep) => s.unlockAfter === null || steps[s.unlockAfter - 1]?.done;
  const activeIndex = steps.findIndex((s) => !s.done && unlocked(s));

  const hide = () =>
    start(async () => {
      const res = await setUiPreferencesAction({ setup_hidden: true });
      if (!res.ok) return void toast.error(res.error);
      router.refresh();
    });

  return (
    <section aria-labelledby="setup-title" className="relative">
      <div className="mb-4 flex items-center justify-between gap-3 px-1">
        <h2 id="setup-title" className="flex items-center gap-2 font-sans text-[0.9375rem] font-bold tracking-normal text-fg">
          <Sparkles className="size-4 text-gold" />
          Conclua sua configuração
          <span className="text-fg-3">·</span>
          <span className="tabular-nums text-fg-2">
            <CountUp value={doneCount} duration={1.2} />/{steps.length}
          </span>
        </h2>
        {all && (
          <Button variant="ghost" size="sm" onClick={hide} loading={pending}>
            Ocultar
          </Button>
        )}
      </div>

      <AnimatePresence initial={false} mode="wait">
        {all ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass flex items-center gap-3 overflow-hidden rounded-[20px] px-5 py-4"
          >
            <span className="grid size-9 place-items-center rounded-full bg-success/15 text-success">
              <DrawCheck className="size-5" />
            </span>
            <p className="text-sm text-fg">Tudo pronto. Sua conta está configurada.</p>
          </motion.div>
        ) : (
          <motion.div key="steps" exit={{ opacity: 0, height: 0 }} className="glass rounded-[24px] p-2.5 md:p-3">
            <ol className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-4">
              {steps.map((s, i) => {
                const Icon = ICONS[i] ?? Sparkles;
                const isUnlocked = unlocked(s);
                const active = i === activeIndex;
                return (
                  <motion.li
                    key={s.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      "relative flex min-h-[12rem] w-[78%] shrink-0 snap-start flex-col overflow-hidden rounded-[20px] border p-5 transition-all duration-500 md:w-auto md:min-h-[13.5rem]",
                      active ? "neon-border border-transparent bg-surface" : "border-line bg-fg/[0.02]",
                      !isUnlocked && "opacity-55",
                    )}
                  >
                    {active && <Aurora variant="subtle" className="opacity-80" interactive={false} />}
                    <div className="relative flex items-center justify-between">
                      <span
                        className={cn(
                          "grid size-7 place-items-center rounded-full border-2",
                          s.done ? "border-success bg-success/15 text-success" : active ? "border-cyan" : "border-line-strong",
                        )}
                      >
                        {s.done && <DrawCheck className="size-4" delay={0.2 + i * 0.1} />}
                      </span>
                      <span className="text-[0.6875rem] font-bold tracking-[0.12em] text-fg-3 uppercase">Etapa {i + 1}</span>
                    </div>
                    <h3 className="relative mt-4 flex items-center gap-2 font-sans text-base font-bold tracking-normal text-fg">
                      <Icon className={cn("size-[18px]", active ? "text-cyan" : "text-fg-2")} />
                      {s.title}
                    </h3>
                    <p className="relative mt-1.5 text-sm leading-relaxed text-fg-2">{s.text}</p>
                    <div className="relative mt-auto pt-4">
                      {s.done ? (
                        <span className="text-xs font-semibold text-success">Concluído</span>
                      ) : !isUnlocked ? (
                        <span className="flex items-center gap-1.5 text-xs text-fg-3">
                          <Lock className="size-3.5" /> Desbloqueia após a etapa {s.unlockAfter}
                        </span>
                      ) : (
                        <Button asChild variant={active ? "metal" : "subtle"} size="sm" className="w-full">
                          <Link href={s.href}>
                            {s.cta} <ArrowRight />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
