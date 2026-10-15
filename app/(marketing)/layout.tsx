import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { SmoothScroll } from "@/components/animations/smooth-scroll";
import { CursorSpotlight } from "@/components/animations/cursor-spotlight";
import { CookieBanner } from "@/components/shared/cookie-banner";
import { getSessionUser } from "@/lib/auth/dal";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return (
    <>
      <SmoothScroll />
      <CursorSpotlight />
      <SiteHeader isAuthenticated={Boolean(user)} />
      <main id="conteudo" className="relative overflow-x-clip">
        {children}
      </main>
      <SiteFooter />
      <CookieBanner />
    </>
  );
}
