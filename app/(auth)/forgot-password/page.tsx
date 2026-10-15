import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotForm } from "@/components/auth/forgot-form";
import { param, type SearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Recuperar senha" };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  return (
    <AuthCard
      eyebrow="Recuperar acesso"
      title="Esqueceu sua senha?"
      description="Informe o e-mail da sua conta e enviaremos um link seguro para criar uma nova senha."
      footer={
        <>
          Lembrou?{" "}
          <Link href="/login" className="font-semibold text-gold-light hover:underline">
            Voltar ao login
          </Link>
        </>
      }
    >
      <ForgotForm expired={param(sp, "error") === "link"} />
    </AuthCard>
  );
}
