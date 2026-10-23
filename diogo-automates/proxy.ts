import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, accessPassword, accessToken, safeEqual } from "@/lib/access";

/**
 * Password gate for access from other devices. Off unless APP_PASSWORD is
 * set, so a plain localhost install behaves exactly as before.
 */
export function proxy(req: NextRequest) {
  const password = accessPassword();
  if (!password) return NextResponse.next();

  const cookie = req.cookies.get(ACCESS_COOKIE)?.value ?? "";
  if (safeEqual(cookie, accessToken(password))) return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Senha de acesso necessária." }, { status: 401 });
  }
  const login = req.nextUrl.clone();
  login.pathname = "/entrar";
  login.search = `?voltar=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(login);
}

export const config = {
  // The login page and what it needs to render stay open, as does the health
  // check the Windows launchers poll before they know whether a password is set.
  matcher: ["/((?!entrar|api/entrar|api/health|_next/static|_next/image|icon.svg|favicon.ico).*)"],
};
