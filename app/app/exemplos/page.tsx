import type { Metadata } from "next";
import { Suspense } from "react";
import { ExamplesGallery } from "@/components/examples/examples-gallery";
import { AppPageHeader } from "@/components/shared/app-page-header";
import { requireOnboardedProfile } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Exemplos" };

export default async function ExamplesPage() {
  await requireOnboardedProfile();
  return (
    <div className="space-y-6 pt-2 pb-8">
      <AppPageHeader title="Exemplos" subtitle="Antes e depois. Passe o mouse para ver." />
      <Suspense>
        <ExamplesGallery />
      </Suspense>
    </div>
  );
}
