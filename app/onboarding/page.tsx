import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = { title: "Boas-vindas" };

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");
  const profile = await getProfile();
  if (profile?.onboarding_completed_at) redirect("/app");

  return (
    <div className="grain relative flex min-h-dvh flex-col overflow-hidden bg-ink">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(22,38,61,0.85),transparent_65%)]" />
        <div className="absolute inset-0 bg-gold-lines opacity-50 [mask-image:radial-gradient(ellipse_at_top,#000,transparent_70%)]" />
        <div className="absolute bottom-[-30%] left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gold/[0.06] blur-[140px]" />
      </div>
      <header className="relative flex justify-center px-6 pt-8">
        <Logo />
      </header>
      <main className="relative flex flex-1 items-start justify-center px-5 py-10 md:items-center">
        <OnboardingWizard
          defaults={{
            fullName: profile?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? "",
            officeName: profile?.office_name ?? "",
            oabNumber: profile?.oab_number ?? "",
            oabUf: (profile?.oab_uf as never) ?? "",
          }}
        />
      </main>
    </div>
  );
}
