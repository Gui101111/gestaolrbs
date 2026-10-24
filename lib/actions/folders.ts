"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/dal";
import { friendlyError } from "@/lib/errors";
import type { ActionResult } from "@/types/domain";

const COLORS = ["gold", "cyan", "blue", "violet", "mint", "gray"] as const;

const nameSchema = z.string().trim().min(1, "Dê um nome à pasta.").max(60, "Use até 60 caracteres.");
const idSchema = z.uuid();

async function requireAuth() {
  const user = await getSessionUser();
  if (!user) throw new Error("session_expired");
  return user;
}

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: friendlyError(e) };
}

function refresh() {
  revalidatePath("/app", "layout");
}

export async function createFolderAction(input: {
  name: string;
  color?: string;
  parentId?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  const parsed = z
    .object({ name: nameSchema, color: z.enum(COLORS).default("gold"), parentId: idSchema.nullable().optional() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos.", field: "name" };
  try {
    const user = await requireAuth();
    const supabase = await createClient();
    const siblings = supabase.from("folders").select("id", { count: "exact", head: true }).eq("owner_id", user.id);
    const { count } = parsed.data.parentId ? await siblings.eq("parent_id", parsed.data.parentId) : await siblings.is("parent_id", null);
    const { data, error } = await supabase
      .from("folders")
      .insert({
        owner_id: user.id,
        name: parsed.data.name,
        color: parsed.data.color,
        parent_id: parsed.data.parentId ?? null,
        position: count ?? 0,
      })
      .select("id")
      .single();
    if (error) throw error;
    refresh();
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function updateFolderAction(
  id: string,
  input: { name?: string; color?: string; parentId?: string | null },
): Promise<ActionResult> {
  const parsed = z
    .object({ name: nameSchema.optional(), color: z.enum(COLORS).optional(), parentId: idSchema.nullable().optional() })
    .safeParse(input);
  if (!parsed.success || !idSchema.safeParse(id).success) {
    return { ok: false, error: parsed.error?.issues[0]?.message ?? "Dados inválidos.", field: "name" };
  }
  try {
    await requireAuth();
    const supabase = await createClient();
    const patch: { name?: string; color?: string; parent_id?: string | null } = {};
    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.color !== undefined) patch.color = parsed.data.color;
    if (parsed.data.parentId !== undefined) patch.parent_id = parsed.data.parentId;
    const { error, count } = await supabase.from("folders").update(patch, { count: "exact" }).eq("id", id);
    if (error) throw error;
    if (!count) throw new Error("folder_not_found");
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Exclui a pasta e as subpastas; os vídeos voltam para "Projetos". */
export async function deleteFolderAction(id: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Pasta não encontrada." };
  try {
    await requireAuth();
    const supabase = await createClient();
    const { error, count } = await supabase.from("folders").delete({ count: "exact" }).eq("id", id);
    if (error) throw error;
    if (!count) throw new Error("folder_not_found");
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Move um ou mais vídeos para uma pasta (ou para a raiz com null). */
export async function moveProjectsAction(ids: string[], folderId: string | null): Promise<ActionResult> {
  const parsed = z.object({ ids: z.array(idSchema).min(1).max(200), folderId: idSchema.nullable() }).safeParse({ ids, folderId });
  if (!parsed.success) return { ok: false, error: "Selecione ao menos um vídeo." };
  try {
    await requireAuth();
    const supabase = await createClient();
    const { error } = await supabase.from("projects").update({ folder_id: parsed.data.folderId }).in("id", parsed.data.ids);
    if (error) throw error;
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
