import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard, authLinkClass } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { authContent } from "@/content/auth";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = { title: "Criar conta" };

export default function RegisterPage() {
  return (
    <AuthCard
      title={authContent.criarConta.title}
      description={authContent.criarConta.description}
      footer={
        <>
          Já tem conta?{" "}
          <Link href={ROUTES.login} className={authLinkClass}>
            Entrar
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
