import Image from "next/image";
import { Logo } from "@/components/brand/logo";
import { Aurora } from "@/components/effects/aurora";
import { accentSegments } from "@/components/shared/accent-text";
import { authContent } from "@/content/auth";

/** Lado esquerdo das telas de acesso: aurora, estátua recortada e uma frase. */
export function AuthShowcase() {
  return (
    <aside className="sticky top-0 hidden h-dvh p-3 lg:block">
      <div className="theme-stage texture-metal relative isolate flex h-full flex-col overflow-hidden rounded-[30px] bg-stage text-fg">
        <Aurora variant="hero" />
        <div aria-hidden className="grid-floor opacity-60" />

        <div className="relative z-10 p-8">
          <Logo />
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center px-10">
          <div
            aria-hidden
            className="absolute top-1/2 left-1/2 size-[min(38rem,90%)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--gold)_24%,transparent),transparent_75%)] blur-3xl animate-pulse-glow motion-reduce:animate-none"
          />
          <div aria-hidden className="absolute bottom-[12%] left-1/2 h-10 w-[46%] -translate-x-1/2 rounded-[50%] bg-black/50 blur-xl" />
          <Image
            src="/media/justica-alpha.webp"
            alt=""
            width={1080}
            height={1056}
            priority
            sizes="(min-width: 1024px) 40vw, 0px"
            className="relative h-auto max-h-full w-full max-w-[34rem] object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.55)] animate-float motion-reduce:animate-none"
          />
        </div>

        <p className="relative z-10 max-w-md p-10 pt-4 font-display text-4xl leading-[1.08] font-bold tracking-tight text-fg xl:text-5xl">
          {accentSegments(authContent.phrase).map((s, i) => (
            <span key={i} className={s.className}>
              {s.text}
            </span>
          ))}
        </p>
      </div>
    </aside>
  );
}
