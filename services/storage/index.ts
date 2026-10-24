import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { BUCKETS } from "@/lib/constants/domain";

type Client = SupabaseClient<Database>;

/**
 * Arquivos privados nunca são expostos diretamente: sempre por URL assinada e temporária.
 * Convenção de caminho: <user_id>/<project_id>/<arquivo>.
 */
export async function signedUrl(client: Client, bucket: string, path: string | null | undefined, opts?: { expiresIn?: number; download?: string | boolean }) {
  if (!path) return null;
  const { data } = await client.storage
    .from(bucket)
    .createSignedUrl(path, opts?.expiresIn ?? 60 * 60, opts?.download ? { download: opts.download } : undefined);
  return data?.signedUrl ?? null;
}

export async function signedUrlMap(client: Client, bucket: string, paths: (string | null | undefined)[], expiresIn = 60 * 60) {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  const map = new Map<string, string>();
  if (!unique.length) return map;
  const { data } = await client.storage.from(bucket).createSignedUrls(unique, expiresIn);
  data?.forEach((d) => {
    if (d.path && d.signedUrl) map.set(d.path, d.signedUrl);
  });
  return map;
}

/** avatar_url pode ser uma URL externa (Google) ou "storage:<bucket>/<path>". */
export async function resolveAvatar(client: Client, avatar: string | null | undefined) {
  if (!avatar) return null;
  if (avatar.startsWith("storage:")) {
    const rest = avatar.slice("storage:".length);
    const slash = rest.indexOf("/");
    return signedUrl(client, rest.slice(0, slash), rest.slice(slash + 1), { expiresIn: 60 * 60 * 6 });
  }
  return avatar;
}

export function originalPath(userId: string, projectId: string, fileName: string) {
  return `${userId}/${projectId}/${Date.now()}-${fileName}`;
}

export function thumbnailPath(userId: string, projectId: string) {
  return `${userId}/${projectId}/thumb-${Date.now()}.jpg`;
}

export function renderPath(userId: string, projectId: string, ratio: string, fileName: string) {
  return `${userId}/${projectId}/${ratio.replace(":", "x")}-${Date.now()}-${fileName}`;
}

export { BUCKETS };
