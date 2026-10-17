import type { ActionResult } from "@/types/domain";

export async function joinWaitlist(_input: { email: string; plan?: string }): Promise<ActionResult> {
  await new Promise((r) => setTimeout(r, 500));
  return { ok: false, error: "Esta é uma prévia: a lista de espera grava os e-mails no app publicado." };
}
