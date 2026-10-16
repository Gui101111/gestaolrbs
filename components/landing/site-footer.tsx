import Link from "next/link";
import { Mail } from "lucide-react";
import { InstagramIcon, LinkedinIcon, YoutubeIcon } from "@/components/brand/social-icons";
import { Logo } from "@/components/brand/logo";
import { siteConfig } from "@/config/site";

const groups = [
  {
    title: "Produto",
    links: [
      { href: "/#produto", label: "Como a IA edita" },
      { href: "/#como-funciona", label: "Como funciona" },
      { href: "/#estilos", label: "Estilos de edição" },
      { href: "/#planos", label: "Planos" },
    ],
  },
  {
    title: "Plataforma",
    links: [
      { href: "/register", label: "Criar conta" },
      { href: "/login", label: "Entrar" },
      { href: "/#faq", label: "Dúvidas frequentes" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/termos", label: "Termos de Uso" },
      { href: "/privacidade", label: "Política de Privacidade" },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative overflow-hidden border-t border-fg/[0.06] bg-ink-2">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 hairline" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-gold/[0.06] blur-[100px]" />
      <div className="relative mx-auto grid max-w-7xl gap-14 px-6 py-20 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-10">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-6 text-sm leading-relaxed text-mist">
            {siteConfig.tagline}. Uma ferramenta de criação e edição de vídeos — o conteúdo e a responsabilidade
            profissional permanecem com o advogado.
          </p>
          <div className="mt-8 flex items-center gap-2">
            {[
              { href: siteConfig.social.instagram, icon: InstagramIcon, label: "Instagram" },
              { href: siteConfig.social.linkedin, icon: LinkedinIcon, label: "LinkedIn" },
              { href: siteConfig.social.youtube, icon: YoutubeIcon, label: "YouTube" },
              { href: `mailto:${siteConfig.contact.email}`, icon: Mail, label: "E-mail" },
            ].map(({ href, icon: Icon, label }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                aria-label={label}
                className="grid size-10 place-items-center rounded-full border border-fg/10 text-mist transition-all duration-500 hover:-translate-y-0.5 hover:border-gold/50 hover:text-gold-light"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>
        {groups.map((g) => (
          <div key={g.title}>
            <p className="eyebrow">{g.title}</p>
            <ul className="mt-6 space-y-3.5">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-mist transition-colors hover:text-ivory">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="relative border-t border-fg/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-xs text-mist/70 md:flex-row md:items-center md:justify-between md:px-10">
          <p>
            © {year} {siteConfig.legal.companyName}. Todos os direitos reservados.
          </p>
          <p>Conteúdo pensado para o Provimento 205/2021 da OAB · Dados tratados conforme a LGPD.</p>
        </div>
      </div>
    </footer>
  );
}
