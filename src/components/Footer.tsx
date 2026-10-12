import { business, navLinks, whatsappUrl } from "@/data/business";
import { Logo } from "./Logo";
import { InstagramIcon, WhatsAppIcon } from "./icons";
import { CurrentYear } from "./CurrentYear";
import { Drip } from "./Drip";

export function Footer() {
  const { address } = business;
  const links = [
    ...navLinks.filter((l) => l.href !== "#contato"),
    { label: "Instagram", href: business.instagramUrl, external: true },
    { label: "WhatsApp", href: whatsappUrl(), external: true },
  ] as { label: string; href: string; external?: boolean }[];

  return (
    <footer className="on-dark relative bg-navy-deep text-white">
      <Drip color="#ffffff" />
      <div className="container-x grid gap-12 pb-16 pt-36 md:pt-44 md:grid-cols-2 lg:grid-cols-12 lg:py-20">
        <div className="lg:col-span-4">
          <Logo tone="light" />
          <p className="mt-5 max-w-xs text-white/80">{business.tagline}</p>
          <div className="mt-6 flex gap-3">
            <a href={business.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label={`Instagram ${business.instagram}`} className="grid size-11 place-items-center rounded-xl bg-white/10 transition-colors hover:bg-white/20">
              <InstagramIcon className="size-5" />
            </a>
            <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp da Berry's" className="grid size-11 place-items-center rounded-xl bg-white/10 transition-colors hover:bg-white/20">
              <WhatsAppIcon className="size-5" />
            </a>
          </div>
        </div>

        <nav aria-label="Rodapé" className="lg:col-span-3">
          <h2 className="eyebrow text-white/70">Navegue</h2>
          <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-white/85">
            {links.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="transition-colors hover:text-berry-light"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="lg:col-span-5">
          <h2 className="eyebrow text-white/70">Visite a Berry&apos;s</h2>
          <address className="mt-5 space-y-3 not-italic text-white/85">
            <p>
              {address.street}
              <br />
              {address.district} – {address.city}/{address.state}
            </p>
            <p>
              <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-berry-light">
                {business.phone}
              </a>
            </p>
            <p>
              <a href={business.instagramUrl} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-berry-light">
                {business.instagram}
              </a>
            </p>
          </address>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="container-x py-6 text-sm text-white/70">
          © <CurrentYear /> Berry&apos;s Porto Seguro. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
