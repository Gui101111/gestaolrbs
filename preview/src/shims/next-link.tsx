import * as React from "react";
import { scrollToId } from "@/components/animations/smooth-scroll";
import { currentLoc, isInternal, navigate, toHref } from "../demo/router";

type Props = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | { pathname?: string; hash?: string; query?: Record<string, string> };
  prefetch?: boolean | null;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  passHref?: boolean;
  legacyBehavior?: boolean;
  locale?: string | false;
  ref?: React.Ref<HTMLAnchorElement>;
};

/** Link do Next na página publicada: rotas do app vão para o hash; âncoras da landing rolam. */
export default function Link({ href, prefetch: _p, replace, scroll, shallow: _sh, passHref: _ph, legacyBehavior: _lb, locale: _l, onClick, ...rest }: Props) {
  const url =
    typeof href === "string"
      ? href
      : `${href.pathname ?? ""}${href.query ? `?${new URLSearchParams(href.query)}` : ""}${href.hash ?? ""}`;
  const anchor = url.startsWith("#") ? url.slice(1) : url.startsWith("/#") ? url.slice(2) : null;
  const internal = anchor === null && isInternal(url);
  const finalHref = anchor !== null ? `#${anchor}` : internal ? toHref(url) : url;
  return (
    <a
      {...rest}
      href={finalHref}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        if (anchor !== null) {
          e.preventDefault();
          if (currentLoc().path !== "/") {
            navigate("/");
            window.setTimeout(() => scrollToId(anchor), 400);
          } else scrollToId(anchor);
          return;
        }
        if (!internal) return;
        e.preventDefault();
        navigate(url, { replace, scroll });
      }}
    />
  );
}
