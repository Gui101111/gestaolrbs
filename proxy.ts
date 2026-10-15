import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Ignora estáticos, imagens, mídia pública e webhooks/callbacks de máquina.
     */
    "/((?!_next/static|_next/image|favicon.ico|media/|api/webhooks|api/jobs/callback|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|ico)$).*)",
  ],
};
