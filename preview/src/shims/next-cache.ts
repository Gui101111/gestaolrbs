import { scheduleRefresh } from "../demo/router";

/** revalidatePath do Next: na página publicada, recarrega os dados da rota atual. */
export function revalidatePath(_path?: string, _type?: string) {
  scheduleRefresh();
}
export const revalidateTag = revalidatePath;
export function unstable_cache<T extends (...args: never[]) => unknown>(fn: T) {
  return fn;
}
