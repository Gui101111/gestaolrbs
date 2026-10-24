import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";
import { authContent } from "@/content/auth";
import { param, type SearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Confira seu e-mail" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  return (
    <AuthCard title={authContent.verificarEmail.title} description={authContent.verificarEmail.description}>
      <VerifyEmailPanel email={param(sp, "email")} />
    </AuthCard>
  );
}
