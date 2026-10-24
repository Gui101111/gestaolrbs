import type { Metadata } from "next";
import { BrandKitForm } from "@/components/brand-kit/brand-kit-form";
import { AppPageHeader } from "@/components/shared/app-page-header";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { signedUrl } from "@/services/storage";
import { BUCKETS } from "@/lib/constants/domain";

export const metadata: Metadata = { title: "Marca" };

export default async function BrandPage() {
  const { user, profile } = await requireOnboardedProfile();
  const supabase = await createClient();
  const { data: kit } = await supabase.from("brand_kits").select("*").eq("user_id", user.id).maybeSingle();
  const logoUrl = await signedUrl(supabase, BUCKETS.brand, kit?.logo_path, { expiresIn: 60 * 60 * 6 });

  return (
    <div className="space-y-8 pt-2 pb-8">
      <AppPageHeader title="Sua *marca*" subtitle="Logo, cores e fonte aplicadas nos seus vídeos." />
      <BrandKitForm
        userId={user.id}
        logo={{ path: kit?.logo_path ?? null, url: logoUrl }}
        initial={{
          officeName: kit?.office_name ?? profile.office_name ?? "",
          professionalName: kit?.professional_name ?? profile.full_name ?? "",
          oabDisplay: kit?.oab_display ?? (profile.oab_number && profile.oab_uf ? `OAB/${profile.oab_uf} ${profile.oab_number}` : ""),
          primaryColor: kit?.primary_color ?? "#F2C46D",
          secondaryColor: kit?.secondary_color ?? "#101216",
          accentColor: kit?.accent_color ?? "#F4F5F7",
          font: kit?.font ?? "",
          website: kit?.website ?? "",
          instagram: kit?.instagram ?? "",
          whatsapp: kit?.whatsapp ?? "",
        }}
      />
    </div>
  );
}
