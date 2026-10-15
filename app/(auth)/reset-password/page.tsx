import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard, FormAlert } from "@/components/auth/auth-card";
import { ResetForm } from "@/components/auth/reset-form";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Redefinir senha" };

export default async function ResetPasswordPage() {
  const user = await getSessionUser();
  return (
    <AuthCard
      eyebrow="Segurança"
      title="Crie uma nova senha."
      description={user ? `Defina a nova senha de acesso para ${user.email}.` : undefined}
    >
      {user ? (
        <ResetForm />
      ) : (
        <div className="space-y-5">
          <FormAlert>O link de redefinição é inválido ou expirou. Solicite um novo para continuar.</FormAlert>
          <Button asChild variant="gold" size="lg" className="w-full">
            <Link href="/forgot-password">Solicitar novo link</Link>
          </Button>
        </div>
      )}
    </AuthCard>
  );
}
