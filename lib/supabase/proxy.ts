import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "./env";
import { ROUTES } from "@/lib/routes";

const PROTECTED = ["/app", "/admin", "/onboarding"];
const AUTH_ONLY_GUEST: string[] = [ROUTES.login, ROUTES.register, ROUTES.forgotPassword];

/**
 * Renova a sessão do Supabase a cada requisição e faz checagens otimistas de rota.
 * A autorização real acontece no servidor (layouts, actions e RLS).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Importante: nada entre a criação do cliente e getClaims().
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const path = request.nextUrl.pathname;

  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.login;
    url.search = "";
    url.searchParams.set("next", path + request.nextUrl.search);
    return redirectWithCookies(url, response);
  }

  if (user && AUTH_ONLY_GUEST.some((p) => path === p)) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return redirectWithCookies(url, response);
  }

  return response;
}

function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  redirect.headers.set("Cache-Control", "private, no-store");
  return redirect;
}
