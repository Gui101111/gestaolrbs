import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Aurora } from "@/components/effects/aurora";
import { AuthShowcase } from "@/components/auth/auth-showcase";
import { ROUTES } from "@/lib/routes";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-page lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <AuthShowcase />
      <div className="relative isolate flex min-h-dvh flex-col overflow-hidden">
        <Aurora variant="subtle" className="lg:hidden" interactive={false} />
        <header className="relative flex items-center justify-between px-5 pt-5 md:px-10 md:pt-8">
          <Logo className="lg:invisible" />
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[0.8125rem] text-fg-2 transition-colors hover:text-fg"
          >
            <ArrowLeft className="size-4" /> Voltar ao site
          </Link>
        </header>
        <main className="relative flex flex-1 items-center justify-center px-4 py-8 md:px-10">{children}</main>
        <footer className="relative px-6 pb-6 text-center text-[0.6875rem] text-fg-3 md:px-10">
          Ao continuar, você concorda com os{" "}
          <Link href={ROUTES.terms} className="text-fg-2 underline-offset-4 hover:underline">
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link href={ROUTES.privacy} className="text-fg-2 underline-offset-4 hover:underline">
            Política de Privacidade
          </Link>
          .
        </footer>
      </div>
    </div>
  );
}
