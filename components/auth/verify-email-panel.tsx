"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { MailOpen, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resendConfirmationAction } from "@/lib/actions/auth";

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
    <div className="space-y-6">
      <div className="panel gold-ring relative overflow-hidden rounded-2xl p-7 text-center">
        <motion.span
          className="mx-auto grid size-16 place-items-center rounded-full border border-gold/40 bg-gold/10 text-gold-light shadow-[0_0_40px_-10px_color-mix(in_oklab,var(--gold)_90%,transparent)]"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <MailOpen className="size-7" />
        </motion.span>
        <p className="mt-5 text-sm leading-relaxed text-mist">
          Enviamos um link de confirmação para
          <br />
          <span className="font-semibold text-ivory">{email ?? "o seu e-mail"}</span>
        </p>
        <p className="mt-3 text-xs text-mist/70">Não encontrou? Verifique a caixa de spam ou promoções.</p>
      </div>
      {webmail && (
        <Button asChild variant="outline" size="lg" className="w-full">
          <a href={webmail.href} target="_blank" rel="noreferrer">
            {webmail.label}
          </a>
        </Button>
      )}
      <Button variant="subtle" size="lg" className="w-full normal-case tracking-normal" disabled={!email || left > 0} loading={pending} onClick={resend}>
        {!pending && <RotateCw />}
        {left > 0 ? `Reenviar em ${left}s` : "Reenviar e-mail"}
      </Button>
      <p className="text-center text-sm text-mist">
        Já confirmou?{" "}
        <Link href="/login" className="font-semibold text-gold-light hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
