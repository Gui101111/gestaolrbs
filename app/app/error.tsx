"use client";

import Link from "next/link";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
      <p className="eyebrow">Algo deu errado</p>
      <h1 className="mt-3 font-display text-4xl text-ivory">Não conseguimos carregar esta área.</h1>
      <p className="mt-3 max-w-md text-mist">Se sua sessão expirou, entre novamente. Caso contrário, tente de novo em instantes.</p>
      <div className="mt-8 flex gap-3">
        <Button variant="gold" onClick={reset}>
          <RotateCw /> Tentar novamente
        </Button>
        <Button asChild variant="outline">
          <Link href="/login?sessao=1">Entrar novamente</Link>
        </Button>
      </div>
    </div>
  );
}
