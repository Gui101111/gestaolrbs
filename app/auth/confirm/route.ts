import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";

function safeNext(next: string | null, fallback: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

/**
 * Confirma links enviados por e-mail (cadastro, recuperação de senha, troca de e-mail).
 * Aceita o formato com token_hash (templates próprios) e o formato PKCE (?code=).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const defaultNext = type === "recovery" ? ROUTES.resetPassword : ROUTES.app;
  const next = safeNext(searchParams.get("next"), defaultNext);

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  const target = type === "recovery" ? `${ROUTES.forgotPassword}?error=link` : `${ROUTES.login}?error=link`;
  return NextResponse.redirect(new URL(target, origin));
}
