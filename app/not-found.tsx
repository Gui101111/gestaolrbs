import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <main className="grain relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-ink px-6 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gold-lines opacity-40 [mask-image:radial-gradient(ellipse_at_center,#000,transparent_70%)]" />
      <div className="absolute top-8">
        <Logo />
      </div>
      <div className="relative w-48 opacity-80">
        <div aria-hidden className="absolute inset-[15%] rounded-full bg-gold/20 blur-3xl" />
        <Image src="/media/justica-alpha.webp" alt="" width={1080} height={1056} className="relative h-auto w-full animate-float" priority />
      </div>
      <p className="eyebrow relative mt-6">Erro 404</p>
      <h1 className="relative mt-3 font-display text-5xl text-ivory md:text-6xl">Esta página não consta nos autos.</h1>
      <p className="relative mt-4 max-w-md text-mist">O endereço pode ter mudado ou não existe mais.</p>
      <div className="relative mt-8 flex gap-3">
        <Button asChild variant="gold">
          <Link href="/">Ir para o início</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/app">Abrir painel</Link>
        </Button>
      </div>
    </main>
  );
}
