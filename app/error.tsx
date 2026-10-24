"use client";

import * as React from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
      <p className="eyebrow">{offline ? "Sem conexão" : "Algo deu errado"}</p>
      <h1 className="mt-3 font-display text-4xl text-ivory md:text-5xl">{offline ? "Você está offline." : "Não foi possível carregar esta página."}</h1>
      <p className="mt-3 max-w-md text-mist">
        {offline ? "Verifique sua conexão com a internet e tente novamente." : "Já registramos o ocorrido. Tente novamente em instantes."}
      </p>
      <div className="mt-8 flex gap-3">
        <Button variant="gold" onClick={reset}>
          <RotateCw /> Tentar novamente
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Início</Link>
        </Button>
      </div>
      {error.digest && <p className="mt-6 font-mono text-[0.6875rem] text-mist/50">Código: {error.digest}</p>}
    </main>
  );
}
