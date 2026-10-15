"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { supabasePublishableKey, supabaseUrl } from "./env";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (!client) client = createBrowserClient<Database>(supabaseUrl(), supabasePublishableKey());
  return client;
}
