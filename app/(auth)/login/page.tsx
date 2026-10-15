import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { param, type SearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const notice = param(sp, "error") ?? (param(sp, "saiu") ? "saiu" : param(sp, "senha") ? "senha" : param(sp, "sessao") ? "sessao" : undefined);
  return (
    <AuthCard
      eyebrow="Acesso"
      title="Bem-vindo de volta."
      description="Entre para acompanhar seus projetos e enviar novos vídeos."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link href="/register" className="font-semibold text-gold-light hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
      <LoginForm next={param(sp, "next")} notice={notice} />
    </AuthCard>
  );
}
