import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { AuthShowcase } from "@/components/auth/auth-showcase";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain relative grid min-h-dvh bg-ink lg:grid-cols-[0.95fr_1.05fr]">
      <AuthShowcase />
      <div className="relative flex min-h-dvh flex-col">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 right-[-10%] h-[520px] w-[520px] rounded-full bg-gold/[0.06] blur-[120px]" />
          <div className="absolute bottom-[-20%] left-[-10%] h-[420px] w-[420px] rounded-full bg-navy-soft/60 blur-[120px] lg:hidden" />
        </div>
        <header className="relative flex items-center justify-between px-6 pt-6 md:px-10 md:pt-8">
          <div className="lg:invisible">
            <Logo />
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[0.8125rem] text-mist transition-colors hover:text-ivory"
          >
            <ArrowLeft className="size-4" /> Voltar ao site
          </Link>
        </header>
        <main className="relative flex flex-1 items-center justify-center px-5 py-10 md:px-10">{children}</main>
        <footer className="relative px-6 pb-6 text-center text-[0.6875rem] text-mist/60 md:px-10">
          Ao continuar, você concorda com os{" "}
          <Link href="/termos" className="text-mist underline-offset-4 hover:underline">
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" className="text-mist underline-offset-4 hover:underline">
            Política de Privacidade
          </Link>
          .
        </footer>
      </div>
    </div>
  );
}
