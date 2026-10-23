import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clapperboard } from "lucide-react";
import { Aurora } from "@/components/effects/aurora";
import { Button } from "@/components/ui/button";
import { WelcomeTitle } from "@/components/home/welcome-title";
import { VideoCard } from "@/components/projects/video-card";
import { QuickUpload } from "@/components/upload/quick-upload";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { ROUTES } from "@/lib/routes";
import { firstName } from "@/lib/utils";
import { getUploadLimits, listProjects } from "@/services/projects/queries";

export const metadata: Metadata = { title: "Início" };

export default async function HomePage() {
  const { user, profile } = await requireOnboardedProfile();
  const [videos, limits] = await Promise.all([listProjects({ userId: user.id, limit: 8 }), getUploadLimits(user.id)]);

  return (
    <div className="space-y-12 pt-2 pb-8 md:space-y-14">
      <section className="relative space-y-8 pt-4 md:pt-8" aria-label="Enviar vídeo">
        <Aurora variant="app" className="-inset-x-24 -top-28 -bottom-10" />
        <div className="relative text-center">
          <WelcomeTitle name={firstName(profile.full_name)} />
          <p className="mx-auto mt-3 max-w-md text-[0.9375rem] text-fg-2 md:text-lg">
            Envie o vídeo. A TRIBUNA corta as pausas e coloca as legendas sozinha.
          </p>
        </div>
        <div className="relative mx-auto max-w-3xl">
          <QuickUpload userId={user.id} maxBytes={limits.maxBytes} maxDurationSec={limits.maxDurationSec} />
        </div>
      </section>

      {videos.length > 0 && (
        <section aria-labelledby="videos-title">
          <div className="mb-4 flex items-center justify-between gap-3 px-1">
            <h2 id="videos-title" className="flex items-center gap-2 font-sans text-[0.9375rem] font-bold tracking-normal text-fg">
              <Clapperboard className="size-4 text-gold" /> Seus vídeos
            </h2>
            <Link
              href={ROUTES.projects}
              className="flex min-h-10 items-center text-sm font-semibold text-fg-2 underline-offset-4 transition hover:text-cyan hover:underline"
            >
              Ver tudo ›
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 max-sm:[&>*:nth-child(n+5)]:hidden">
            {videos.map((p, i) => (
              <VideoCard key={p.id} project={p} index={i} />
            ))}
          </div>
          <div className="mt-6 flex justify-center md:hidden">
            <Button asChild variant="glass">
              <Link href={ROUTES.projects}>
                Ver todos <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
