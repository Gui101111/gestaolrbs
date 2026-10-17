"use client";

import * as React from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authLinkClass } from "@/components/auth/auth-card";
import { NeonEnvelope } from "@/components/auth/neon-envelope";
import { resendConfirmationAction } from "@/lib/actions/auth";
import { ROUTES } from "@/lib/routes";

const COOLDOWN = 60;

export function VerifyEmailPanel({ email }: { email?: string }) {
  const [left, setLeft] = React.useState(COOLDOWN);
  const [pending, start] = React.useTransition();

  React.useEffect(() => {
    if (left <= 0) return;
    const t = window.setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left]);

  const resend = () => {
    if (!email) return;
    start(async () => {
      const res = await resendConfirmationAction(email);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Enviamos um novo link de confirmação.");
      setLeft(COOLDOWN);
    });
  };

  const domain = email?.split("@")[1]?.toLowerCase() ?? "";
  const webmail = domain.includes("gmail")
    ? { label: "Abrir Gmail", href: "https://mail.google.com" }
    : /outlook|hotmail|live/.test(domain)
      ? { label: "Abrir Outlook", href: "https://outlook.live.com" }
      : null;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <NeonEnvelope />
        <p className="mt-5 text-sm leading-relaxed text-fg-2">
          Enviamos o link para
          <br />
          <span className="font-semibold break-all text-fg">{email ?? "o seu e-mail"}</span>
        </p>
        <p className="mt-2 text-xs text-fg-3">Não chegou? Veja o spam ou promoções.</p>
      </div>
      {webmail && (
        <Button asChild variant="gold" size="lg" className="w-full">
          <a href={webmail.href} target="_blank" rel="noreferrer">
            {webmail.label}
          </a>
        </Button>
      )}
      <Button variant="glass" size="lg" className="w-full" disabled={!email || left > 0} loading={pending} onClick={resend}>
        {!pending && <RotateCw />}
        {left > 0 ? `Reenviar em ${left}s` : "Reenviar e-mail"}
      </Button>
      <p className="text-center text-sm text-fg-2">
        Já confirmou?{" "}
        <Link href={ROUTES.login} className={authLinkClass}>
          Entrar
        </Link>
      </p>
    </div>
  );
}
