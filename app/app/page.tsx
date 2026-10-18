import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clapperboard, Plus } from "lucide-react";
import { Aurora } from "@/components/effects/aurora";
import { Button } from "@/components/ui/button";
import { SetupSteps, type SetupStep } from "@/components/home/setup-steps";
import { TemplateCards } from "@/components/home/template-cards";
import { WelcomeTitle } from "@/components/home/welcome-title";
import { VideoCard } from "@/components/projects/video-card";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { welcomeName } from "@/lib/utils";
import { listProjects } from "@/services/projects/queries";

export const metadata: Metadata = { title: "Início" };

export default async function HomePage() {
  const { user, profile } = await requireOnboardedProfile();
  const supabase = await createClient();
  const [videos, { data: brand }, { count: submitted }, { count: downloaded }] = await Promise.all([
    listProjects({ userId: user.id, limit: 8 }),
    supabase.from("brand_kits").select("logo_path").eq("user_id", user.id).maybeSingle(),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("user_id", user.id).neq("status", "draft"),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("user_id", user.id).not("first_downloaded_at", "is", null),
  ]);

  const prefs = (profile.preferences && typeof profile.preferences === "object" && !Array.isArray(profile.preferences)
    ? profile.preferences
    : {}) as { setup_hidden?: boolean; hidden_models?: string[] };

  const steps: SetupStep[] = [
    {
      id: "perfil",
      title: "Complete seu perfil",
      text: "Escritório e áreas de atuação.",
      done: Boolean(profile.office_name && (profile.practice_areas?.length || profile.legal_area)),
      unlockAfter: null,
      href: `${ROUTES.settings}?aba=conta`,
      cta: "Completar",
    },
    {
      id: "marca",
      title: "Envie sua marca",
      text: "Logo e cores nos seus vídeos.",
      done: Boolean(brand?.logo_path),
      unlockAfter: 1,
      href: ROUTES.brand,
      cta: "Enviar logo",
    },
    {
      id: "video",
      title: "Crie seu primeiro vídeo",
      text: "Envie e escolha o estilo.",
      done: (submitted ?? 0) > 0,
      unlockAfter: 1,
      href: ROUTES.newVideo,
      cta: "Criar vídeo",
    },
    {
      id: "publicar",
      title: "Baixe e publique",
      text: "Seu vídeo pronto para postar.",
      done: (downloaded ?? 0) > 0,
      unlockAfter: 3,
      href: ROUTES.projects,
      cta: "Ver vídeos",
    },
  ];

  const name = welcomeName(profile.full_name, profile.treatment);

  return (
    <div className="space-y-12 pt-2 pb-8 md:space-y-14">
      <section className="relative pt-6 text-center md:pt-10">
        <Aurora variant="app" className="-inset-x-24 -top-28 -bottom-10" />
        <WelcomeTitle name={name} feminine={profile.treatment === "dra" || (!profile.treatment && /^(dra|doutora)\.?\s/i.test(profile.full_name ?? ""))} />
      </section>

      {!prefs.setup_hidden && <SetupSteps steps={steps} />}

      <TemplateCards hidden={prefs.hidden_models ?? []} />

      <section aria-labelledby="videos-title">
        <div className="mb-4 flex items-center justify-between gap-3 px-1">
          <h2 id="videos-title" className="flex items-center gap-2 font-sans text-[0.9375rem] font-bold tracking-normal text-fg">
            <Clapperboard className="size-4 text-gold" /> Seus vídeos
          </h2>
          {videos.length > 0 && (
            <Link href={ROUTES.projects} className="text-sm font-semibold text-fg-2 underline-offset-4 transition hover:text-cyan hover:underline">
              Ver tudo ›
            </Link>
          )}
        </div>
        {videos.length === 0 ? (
          <div className="glass relative overflow-hidden rounded-[24px] px-6 py-14 text-center">
            <Aurora variant="subtle" interactive={false} />
            <div className="relative mx-auto grid size-16 place-items-center rounded-2xl border border-cyan/30 bg-cyan/[0.08] shadow-[var(--glow-cyan)]">
              <Clapperboard className="size-7 text-cyan" />
            </div>
            <p className="relative mt-5 font-display text-xl text-fg">Nenhum vídeo ainda.</p>
            <p className="relative mt-1 text-sm text-fg-2">Envie a primeira gravação. Leva um minuto.</p>
            <Button asChild variant="gold" size="lg" pulse className="relative mt-6">
              <Link href={ROUTES.newVideo}>
                <Plus /> Criar meu primeiro vídeo
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 max-sm:[&>*:nth-child(n+5)]:hidden">
            {videos.map((p, i) => (
              <VideoCard key={p.id} project={p} index={i} />
            ))}
          </div>
        )}
        {videos.length > 0 && (
          <div className="mt-6 flex justify-center md:hidden">
            <Button asChild variant="glass">
              <Link href={ROUTES.projects}>
                Ver todos <ArrowRight />
              </Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
