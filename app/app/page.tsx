import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, Clock3, FolderOpen, Plus, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/dashboard/stat-card";
import { ProjectCard } from "@/components/projects/project-card";
import { EmptyState } from "@/components/shared/empty-state";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { getDashboardData } from "@/services/projects/queries";
import { PIPELINE_STEPS } from "@/lib/constants/domain";
import { firstName, formatRelative, greeting } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const WIZARD_STEPS = ["Vídeo", "Objetivo", "Estilo", "Formato", "Personalizar", "Revisão"];

export default async function DashboardPage() {
  const { user, profile } = await requireOnboardedProfile();
  const data = await getDashboardData(user.id);
  const { billing } = data;
  const minutesUsed = Number(billing.usage?.minutes_used ?? 0);
  const minutesLimit = billing.active ? billing.plan?.minutes_per_month : null;
  const name = firstName(profile.full_name);
  const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(new Date());

  return (
    <div className="space-y-10">
      {/* Boas-vindas + CTA principal */}
      <section className="panel gold-ring relative overflow-hidden rounded-3xl">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-navy-deep via-[#0c121b]/90 to-transparent" />
          <div className="absolute inset-0 bg-gold-lines opacity-40 [mask-image:linear-gradient(90deg,#000,transparent)]" />
        </div>
        <div className="relative grid items-center gap-6 p-6 md:grid-cols-[1fr_auto] md:p-10">
          <div>
            <p className="eyebrow">{today}</p>
            <h1 className="mt-3 font-display text-4xl leading-tight text-ivory md:text-5xl">
              {greeting()}, <span className="text-gold-gradient italic">{name || "Dr(a)."}</span>
            </h1>
            <p className="mt-3 max-w-lg text-[0.9375rem] text-mist">
              Envie um vídeo bruto e deixe a inteligência cuidar da edição. Você acompanha cada etapa por aqui.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild variant="gold" size="xl" className="glow-gold">
                <Link href="/app/projetos/novo">
                  <Plus strokeWidth={2.5} /> Novo projeto
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/app/biblioteca">
                  <FolderOpen /> Biblioteca
                </Link>
              </Button>
            </div>
          </div>
          <div className="pointer-events-none relative mx-auto hidden w-56 md:block lg:w-64">
            <div aria-hidden className="absolute inset-[15%] rounded-full bg-gold/20 blur-3xl" />
            <Image src="/media/justica-alpha.webp" alt="" width={1080} height={1056} className="relative h-auto w-full animate-float" priority />
          </div>
        </div>
      </section>

      {/* Indicadores */}
      <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4" aria-label="Indicadores">
        <StatCard icon={<FolderOpen className="size-4" />} label="Projetos" value={data.total} caption="criados até agora" index={0} />
        <StatCard icon={<CheckCircle2 className="size-4" />} label="Vídeos processados" value={data.processed} caption="prontos ou concluídos" index={1} />
        <StatCard icon={<Clock3 className="size-4" />} label="Em processamento" value={data.processing} caption="na fila ou em edição" index={2} accent />
        <StatCard
          icon={<Timer className="size-4" />}
          label="Minutos utilizados"
          value={minutesUsed}
          decimals={minutesUsed % 1 ? 1 : 0}
          caption={minutesLimit ? `de ${minutesLimit} min no ciclo` : "neste ciclo"}
          index={3}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Continue de onde parou */}
        <section className="rounded-3xl border border-fg/[0.07] bg-fg/[0.02] p-6 md:p-7">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl text-ivory">Continue de onde parou</h2>
            {data.continueProject && <span className="text-xs text-mist">{formatRelative(data.continueProject.updated_at)}</span>}
          </div>
          {data.continueProject ? (
            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl border border-fg/10 bg-navy-deep sm:w-48">
                {data.continueProject.thumbnail_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.continueProject.thumbnail_url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ivory">{data.continueProject.name}</p>
                <p className="mt-1 text-xs text-mist">
                  Etapa {Math.min(data.continueProject.wizard_step, WIZARD_STEPS.length)} de {WIZARD_STEPS.length} ·{" "}
                  {WIZARD_STEPS[Math.min(data.continueProject.wizard_step, WIZARD_STEPS.length) - 1]}
                </p>
                <Progress value={(Math.min(data.continueProject.wizard_step, WIZARD_STEPS.length) / WIZARD_STEPS.length) * 100} className="mt-3" />
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href={`/app/projetos/novo?id=${data.continueProject.id}`}>
                    Continuar <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-mist">Nenhum rascunho pendente. Que tal começar um novo vídeo?</p>
          )}
        </section>

        {/* Em processamento */}
        <section className="rounded-3xl border border-fg/[0.07] bg-fg/[0.02] p-6 md:p-7">
          <h2 className="font-display text-2xl text-ivory">Em processamento</h2>
          {data.inFlight.length ? (
            <ul className="mt-5 space-y-4">
              {data.inFlight.slice(0, 4).map((p) => {
                const step = PIPELINE_STEPS.find((s) => s.value === p.job?.current_step);
                return (
                  <li key={p.id}>
                    <Link href={`/app/projetos/${p.id}`} className="group block rounded-xl p-2 -m-2 transition hover:bg-fg/[0.03]">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate text-ivory group-hover:text-gold-light">{p.name}</span>
                        <span className="text-xs text-mist tabular-nums">{p.job?.progress ?? 0}%</span>
                      </div>
                      <p className="mt-0.5 text-xs text-gold/80">{step?.label ?? "Na fila"}</p>
                      <Progress value={p.job?.progress ?? 0} className="mt-2" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-mist">Nenhum vídeo em edição agora.</p>
          )}
        </section>
      </div>

      {/* Biblioteca recente */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="eyebrow">Biblioteca</p>
            <h2 className="mt-2 font-display text-3xl text-ivory">Projetos recentes</h2>
          </div>
          {data.recent.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/app/biblioteca">
                Ver todos <ArrowRight />
              </Link>
            </Button>
          )}
        </div>
        {data.recent.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.recent.map((p, i) => (
              <ProjectCard key={p.id} project={p} index={i} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Você ainda não criou nenhum projeto."
            description="Envie o vídeo bruto de uma gravação sua. Em poucos passos, a plataforma prepara a edição profissional."
            action={
              <Button asChild variant="gold" size="lg">
                <Link href="/app/projetos/novo">Criar primeiro vídeo</Link>
              </Button>
            }
          />
        )}
      </section>

      {!billing.active && (
        <section className="rounded-2xl border border-warning/30 bg-warning/[0.06] p-5 text-sm text-[#f1cf93]">
          Sua assinatura não está ativa. Você pode preparar rascunhos, mas precisará de um plano para enviar vídeos para edição.{" "}
          <Link href="/app/assinatura" className="font-semibold underline underline-offset-4">
            Ver planos
          </Link>
        </section>
      )}
    </div>
  );
}
