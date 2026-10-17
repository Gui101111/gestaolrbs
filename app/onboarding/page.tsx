import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { ROUTES } from "@/lib/routes";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { Logo } from "@/components/brand/logo";
import { Aurora } from "@/components/effects/aurora";

export const metadata: Metadata = { title: "Boas-vindas" };

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");
  const profile = await getProfile();
  if (profile?.onboarding_completed_at) redirect(ROUTES.app);

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-page">
      <Aurora variant="app" />
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
