import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard, authLinkClass } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { authContent } from "@/content/auth";
import { ROUTES } from "@/lib/routes";
import { param, type SearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const notice = param(sp, "error") ?? (param(sp, "saiu") ? "saiu" : param(sp, "senha") ? "senha" : param(sp, "sessao") ? "sessao" : undefined);
  return (
    <AuthCard
      title={authContent.entrar.title}
      description={authContent.entrar.description}
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link href={ROUTES.register} className={authLinkClass}>
            Criar conta
          </Link>
        </>
      }
    >
      <LoginForm next={param(sp, "next")} notice={notice} />
    </AuthCard>
  );
}
