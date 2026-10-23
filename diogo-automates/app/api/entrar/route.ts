import { NextResponse } from "next/server";
import { ACCESS_COOKIE, accessPassword, accessToken, safeEqual } from "@/lib/access";

export const runtime = "nodejs";

/** Only same-origin paths, so the login form can't be used as an open redirect. */
function safeBack(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/";
}

function redirect(location: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: location } });
}

export async function POST(req: Request) {
  const form = await req.formData();
  const back = safeBack(String(form.get("voltar") ?? "/"));
  const given = String(form.get("senha") ?? "");
  const password = accessPassword();

  if (!password) return redirect(back);

  if (!safeEqual(given, password)) {
    // Slows down guessing from another device on the network.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return redirect(`/entrar?erro=1&voltar=${encodeURIComponent(back)}`);
  }

  const res = redirect(back);
  res.cookies.set(ACCESS_COOKIE, accessToken(password), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
