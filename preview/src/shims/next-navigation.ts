import * as React from "react";
import { currentLoc, navigate, refresh, useLoc } from "../demo/router";

/** redirect()/notFound() dos componentes de servidor: o roteador da demonstração trata. */
export class RedirectSignal extends Error {
  constructor(public url: string) {
    super("NEXT_REDIRECT");
  }
}
export class NotFoundSignal extends Error {
  constructor() {
    super("NEXT_NOT_FOUND");
  }
}

export function redirect(url: string): never {
  throw new RedirectSignal(url);
}
export const permanentRedirect = redirect;
export function notFound(): never {
  throw new NotFoundSignal();
}

export function usePathname() {
  return useLoc().path;
}

export function useSearchParams() {
  const { search } = useLoc();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

const router = {
  push: (url: string, opts?: { scroll?: boolean }) => navigate(url, { scroll: opts?.scroll }),
  replace: (url: string, opts?: { scroll?: boolean }) => navigate(url, { replace: true, scroll: opts?.scroll }),
  refresh,
  back: () => history.back(),
  forward: () => history.forward(),
  prefetch: () => {},
};

export function useRouter() {
  return router;
}

export function useParams() {
  return {};
}

export const getPathname = () => currentLoc().path;
