import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard, authLinkClass } from "@/components/auth/auth-card";
import { ForgotForm } from "@/components/auth/forgot-form";
import { authContent } from "@/content/auth";
import { ROUTES } from "@/lib/routes";
import { param, type SearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Recuperar senha" };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  return (
    <AuthCard
      title={authContent.recuperarSenha.title}
      description={authContent.recuperarSenha.description}
      footer={
        <>
          Lembrou?{" "}
          <Link href={ROUTES.login} className={authLinkClass}>
            Voltar para entrar
          </Link>
        </>
      }
    >
      <ForgotForm expired={param(sp, "error") === "link"} />
    </AuthCard>
  );
}
