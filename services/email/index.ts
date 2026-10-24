import "server-only";
import { Resend } from "resend";

type SendInput = { to: string | string[]; subject: string; html: string; replyTo?: string };

let client: Resend | null = null;

/**
 * Envia e-mail transacional via Resend.
 * Sem RESEND_API_KEY o envio é apenas registrado em log (desenvolvimento) — nunca quebra o fluxo.
 */
export async function sendEmail({ to, subject, html, replyTo }: SendInput): Promise<{ ok: boolean; id?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "TRIBUNA <onboarding@resend.dev>";
  if (!key) {
    console.info(`[email:dev] para=${Array.isArray(to) ? to.join(",") : to} assunto="${subject}"`);
    return { ok: true };
  }
  try {
    client ??= new Resend(key);
    const { data, error } = await client.emails.send({ from, to, subject, html, replyTo });
    if (error) {
      console.error("[email] falha no envio", error.name);
      return { ok: false };
    }
    return { ok: true, id: data?.id };
  } catch (e) {
    console.error("[email] erro inesperado", e instanceof Error ? e.message : e);
    return { ok: false };
  }
}

export { emailTemplates } from "./templates";
