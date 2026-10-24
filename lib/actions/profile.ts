"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth/dal";
import { nameSchema } from "@/lib/validations/common";
import { friendlyError } from "@/lib/errors";
import { BUCKETS } from "@/lib/constants/domain";
import type { ActionResult } from "@/types/domain";

/** Conta: só o nome (o e-mail é o de acesso). */
export async function updateNameAction(fullName: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: friendlyError("session_expired") };
  const parsed = nameSchema.safeParse(fullName);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Verifique o nome.", field: "fullName" };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: parsed.data }).eq("id", user.id);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/app", "layout");
  return { ok: true };
}

/** Exclusão definitiva da conta (LGPD): arquivos, dados e usuário. */
export async function deleteAccountAction(confirmation: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: friendlyError("session_expired") };
  if (confirmation.trim().toUpperCase() !== "EXCLUIR") return { ok: false, error: "Digite EXCLUIR para confirmar.", field: "confirmation" };

  const admin = createAdminClient();
  for (const bucket of Object.values(BUCKETS)) {
    await removeFolder(admin, bucket, user.id);
  }
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, error: friendlyError(error) };

  const supabase = await createClient();
  await supabase.auth.signOut();
  return { ok: true };
}

type Admin = ReturnType<typeof createAdminClient>;

async function removeFolder(admin: Admin, bucket: string, prefix: string): Promise<void> {
  const { data } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (!data?.length) return;
  const files: string[] = [];
  for (const item of data) {
    const path = `${prefix}/${item.name}`;
    if (item.id === null) await removeFolder(admin, bucket, path);
    else files.push(path);
  }
  if (files.length) await admin.storage.from(bucket).remove(files);
}
