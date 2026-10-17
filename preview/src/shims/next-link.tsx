import * as React from "react";
import { toast } from "sonner";
import { scrollToId } from "@/components/animations/smooth-scroll";

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string | { pathname?: string; hash?: string };
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  passHref?: boolean;
  legacyBehavior?: boolean;
  locale?: string | false;
  ref?: React.Ref<HTMLAnchorElement>;
};

export const OPEN_EDITOR = "tribuna:editor";
const openEditor = () => window.dispatchEvent(new Event(OPEN_EDITOR));

/** Rotas que levam a criar um vídeo: na página estática, abrem o editor no navegador. */
const EDITOR_ROUTES = /^\/(criar-conta|app)(\/|\?|$)/;

/** Na prévia estática não existem as rotas do app: âncoras rolam, criar vídeo abre o editor, o resto avisa. */
export default function Link({ href, prefetch: _p, replace: _r, scroll: _s, shallow: _sh, passHref: _ph, legacyBehavior: _lb, locale: _l, onClick, ...rest }: Props) {
  const url = typeof href === "string" ? href : `${href.pathname ?? ""}${href.hash ?? ""}`;
  const hash = url.startsWith("#") ? url.slice(1) : url.startsWith("/#") ? url.slice(2) : null;
  const external = /^https?:\/\//.test(url) || url.startsWith("mailto:");
  const finalHref = hash !== null ? `#${hash}` : external ? url : EDITOR_ROUTES.test(url) ? "#editor" : "#";
  return (
    <a
      {...rest}
      href={finalHref}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || external) return;
        e.preventDefault();
        if (hash) {
          scrollToId(hash);
          return;
        }
        if (url === "/" || url === "") {
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        if (EDITOR_ROUTES.test(url)) {
          openEditor();
          return;
        }
        if (url.startsWith("/entrar")) {
          toast("Conta e painel ficam no app publicado", {
            description: "Aqui você já pode editar um vídeo agora mesmo, sem cadastro.",
            action: { label: "Editar um vídeo", onClick: openEditor },
          });
          return;
        }
        toast("Esta página fica no app publicado", {
          description: "Enquanto isso, edite um vídeo aqui mesmo, sem cadastro.",
          action: { label: "Editar um vídeo", onClick: openEditor },
        });
      }}
    />
  );
}
