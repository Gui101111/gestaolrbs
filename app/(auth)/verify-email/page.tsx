import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";
import { param, type SearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Confirme seu e-mail" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  return (
    <AuthCard
      eyebrow="Quase lá"
      title="Confira seu e-mail."
      description="Sua conta será ativada assim que você confirmar o endereço de e-mail."
    >
      <VerifyEmailPanel email={param(sp, "email")} />
    </AuthCard>
  );
}
