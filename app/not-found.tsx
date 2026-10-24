import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { Aurora } from "@/components/effects/aurora";
import { ROUTES } from "@/lib/routes";

export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-page px-6 text-center">
      <Aurora variant="subtle" interactive={false} />
      <div className="absolute top-6 md:top-8">
        <Logo />
      </div>
      <div className="relative w-44 md:w-52">
        <div aria-hidden className="absolute inset-[12%] rounded-full bg-gold/25 blur-3xl" />
        <Image src="/media/justica-alpha.webp" alt="" width={1080} height={1056} className="relative h-auto w-full animate-float motion-reduce:animate-none" priority />
      </div>
      <p className="eyebrow relative mt-6">Erro 404</p>
      <h1 className="relative mt-3 max-w-2xl text-4xl text-fg md:text-6xl">
        Página fora dos <em>autos</em>.
      </h1>
      <p className="relative mt-4 max-w-md text-fg-2">O endereço mudou ou não existe mais.</p>
      <div className="relative mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild variant="gold">
          <Link href={ROUTES.home}>Ir para o início</Link>
        </Button>
        <Button asChild variant="glass">
          <Link href={ROUTES.app}>Abrir o app</Link>
        </Button>
      </div>
    </main>
  );
}
