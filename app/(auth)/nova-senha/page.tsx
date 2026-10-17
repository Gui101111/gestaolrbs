import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard, FormAlert } from "@/components/auth/auth-card";
import { ResetForm } from "@/components/auth/reset-form";
import { Button } from "@/components/ui/button";
import { authContent } from "@/content/auth";
import { getSessionUser } from "@/lib/auth/dal";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = { title: "Nova senha" };

export default async function ResetPasswordPage() {
  const user = await getSessionUser();
  return (
    <AuthCard title={authContent.novaSenha.title} description={user ? `Nova senha para ${user.email}.` : undefined}>
      {user ? (
        <ResetForm />
      ) : (
        <div className="space-y-5">
          <FormAlert>O link expirou ou é inválido. Peça um novo.</FormAlert>
          <Button asChild variant="gold" size="lg" className="w-full">
            <Link href={ROUTES.forgotPassword}>Pedir novo link</Link>
          </Button>
        </div>
      )}
    </AuthCard>
  );
}
