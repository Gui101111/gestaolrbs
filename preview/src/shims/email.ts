/** E-mails não saem da página de demonstração. */
export async function sendEmail(_input: unknown): Promise<{ ok: boolean; id?: string }> {
  return { ok: true };
}
export const emailTemplates = new Proxy({} as Record<string, (...args: unknown[]) => { subject: string; html: string }>, {
  get: () => () => ({ subject: "", html: "" }),
});
