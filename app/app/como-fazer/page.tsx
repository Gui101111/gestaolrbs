import type { Metadata } from "next";
import { HowToView } from "@/components/how-to/how-to-view";
import { AppPageHeader } from "@/components/shared/app-page-header";
import { requireOnboardedProfile } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Como fazer" };

export default async function HowToPage() {
  await requireOnboardedProfile();
  return (
    <div className="space-y-8 pt-2 pb-8">
      <AppPageHeader title="Como *fazer*" subtitle="Guias rápidos para gravar, enviar e publicar." />
      <HowToView />
    </div>
  );
}
