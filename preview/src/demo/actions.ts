import { RedirectSignal } from "../shims/next-navigation";
import { navigate } from "./router";

/**
 * As server actions reais rodam no navegador. Um redirect() dentro delas
 * vira navegação, como no Next.
 */
export function wrapAction<A extends unknown[], R>(fn: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof RedirectSignal) {
        navigate(e.url, { replace: true });
        return undefined as R;
      }
      throw e;
    }
  };
}
