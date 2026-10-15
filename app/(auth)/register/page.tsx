import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Criar conta" };

export default function RegisterPage() {
  return (
    <AuthCard
      eyebrow="Criar conta"
      title={
        <>
          Seu primeiro vídeo <span className="text-gold-gradient italic">começa aqui.</span>
        </>
      }
      description="Cadastre-se em menos de um minuto. Sem cartão de crédito para começar."
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold text-gold-light hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
