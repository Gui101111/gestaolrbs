import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Plan } from "@/types/domain";

/** Planos públicos e ativos, ordenados. Falhas retornam lista vazia (landing mostra "Planos em breve"). */
export async function getPublicPlans(): Promise<Plan[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .eq("is_public", true)
      .order("sort_order", { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}
