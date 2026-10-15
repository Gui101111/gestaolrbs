import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { BrandKitForm } from "@/components/brand-kit/brand-kit-form";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { signedUrl } from "@/services/storage";
import { BUCKETS } from "@/lib/constants/domain";

export const metadata: Metadata = { title: "Minha Marca" };

export default async function BrandPage() {
  const { user, profile } = await requireOnboardedProfile();
  const supabase = await createClient();
  const { data: kit } = await supabase.from("brand_kits").select("*").eq("user_id", user.id).maybeSingle();
  const logoUrl = await signedUrl(supabase, BUCKETS.brand, kit?.logo_path, { expiresIn: 60 * 60 * 6 });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Minha Marca"
        title="Identidade do escritório"
        description="Salve uma vez. Logotipo, cores, fonte e contatos podem ser aplicados automaticamente em cada vídeo."
      />
      <BrandKitForm
        userId={user.id}
        logo={{ path: kit?.logo_path ?? null, url: logoUrl }}
        initial={{
          officeName: kit?.office_name ?? profile.office_name ?? "",
          professionalName: kit?.professional_name ?? profile.full_name ?? "",
          oabDisplay: kit?.oab_display ?? (profile.oab_number && profile.oab_uf ? `OAB/${profile.oab_uf} ${profile.oab_number}` : ""),
          primaryColor: kit?.primary_color ?? "#C6A15B",
          secondaryColor: kit?.secondary_color ?? "#0B1625",
          accentColor: kit?.accent_color ?? "#F5F5F2",
          font: kit?.font ?? "",
          website: kit?.website ?? "",
          instagram: kit?.instagram ?? "",
          whatsapp: kit?.whatsapp ?? "",
        }}
      />
    </div>
  );
}
