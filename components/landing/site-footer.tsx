import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { siteConfig } from "@/config/site";
import { ROUTES } from "@/lib/routes";
import { NeonDivider } from "@/components/effects/neon-divider";

/** Rodapé em uma linha: logo · Termos · Privacidade · Contato · ©. */
export function SiteFooter() {
  return (
    <footer data-site-footer className="relative px-5 py-6 md:px-10">
      <NeonDivider className="absolute inset-x-0 top-0 opacity-60" />
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-sm text-fg-3 md:flex-row md:justify-between">
        <Logo />
        <nav aria-label="Rodapé" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link href={ROUTES.terms} className="transition-colors hover:text-fg">
            Termos
          </Link>
          <Link href={ROUTES.privacy} className="transition-colors hover:text-fg">
            Privacidade
          </Link>
          <a href={`mailto:${siteConfig.contact.email}`} className="transition-colors hover:text-fg">
            Contato
          </a>
          <span>© {new Date().getFullYear()} {siteConfig.name}</span>
        </nav>
      </div>
    </footer>
  );
}
