/**
 * Banco de demonstração: as mesmas tabelas do Supabase, guardadas no próprio
 * navegador (localStorage para as linhas, IndexedDB para os arquivos). As
 * páginas e as server actions reais do app rodam em cima dele.
 */

export type Row = Record<string, unknown> & { id: string };
export type Change = { table: string; eventType: "INSERT" | "UPDATE" | "DELETE"; new: Row; old: Row | null };

const KEY = "tribuna-demo-v1";
const now = () => new Date().toISOString();
export const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (+c ^ (Math.random() * 16) >> (+c / 4)).toString(16));

/** Valores padrão das colunas (espelham as migrations). */
const DEFAULTS: Record<string, () => Record<string, unknown>> = {
  profiles: () => ({
    email: null, full_name: null, avatar_url: null, phone: null, office_name: null, oab_number: null, oab_uf: null, legal_area: null,
    practice_areas: [], main_goal: null, role: "user", onboarding_completed_at: null, terms_accepted_at: null, default_editing_style: null,
    default_platforms: [], preferences: {}, treatment: null,
  }),
  brand_kits: () => ({
    office_name: null, professional_name: null, oab_display: null, logo_path: null, primary_color: "#C6A15B", secondary_color: "#0B1625",
    accent_color: "#F5F5F2", font: null, website: null, instagram: null, whatsapp: null,
  }),
  plans: () => ({
    description: null, price_cents: null, currency: "BRL", billing_interval: "month", trial_days: null, videos_per_month: null, minutes_per_month: null,
    max_video_duration_sec: null, max_upload_mb: 2048, revisions_per_video: 1, max_resolution: "1080p", storage_gb: null, render_priority: "standard",
    allowed_aspect_ratios: ["9:16", "1:1", "4:5", "16:9"], features: [], is_featured: false, is_active: true, is_public: true, sort_order: 0,
  }),
  subscriptions: () => ({
    plan_id: null, status: "incomplete", provider: "manual", provider_customer_id: null, provider_subscription_id: null, current_period_start: null,
    current_period_end: null, cancel_at_period_end: false, canceled_at: null,
  }),
  payments: () => ({ subscription_id: null, provider: "demo", provider_payment_id: null, amount_cents: 0, status: "pending", billing_type: null, invoice_url: null, description: null, due_date: null, paid_at: null }),
  usage: () => ({ videos_created: 0, minutes_used: 0, storage_bytes: 0 }),
  folders: () => ({ parent_id: null, color: "gold", position: 0 }),
  projects: () => ({
    name: "Novo projeto", status: "draft", objective: null, legal_area: null, editing_style: null, platforms: [], aspect_ratios: [], settings: {}, options: {},
    instructions: null, wizard_step: 1, source_duration_sec: null, source_width: null, source_height: null, source_size_bytes: null, thumbnail_path: null,
    rights_confirmed_at: null, submitted_at: null, completed_at: null, revisions_used: 0, parent_project_id: null, version: 1, folder_id: null,
    first_downloaded_at: null,
  }),
  project_files: () => ({ kind: "original", bucket: "original-videos", mime_type: null, size_bytes: null, duration_sec: null, width: null, height: null, status: "pending", sort_order: 0 }),
  render_jobs: () => ({
    status: "queued", progress: 0, current_step: "upload_completed", provider: "manual", external_id: null, attempts: 0, kind: "initial", brief: null, edit_plan: null,
    step_history: [], error_code: null, error_message: null, started_at: null, completed_at: null, compliance_flags: [], review_status: null, output_version: 1,
  }),
  renders: () => ({ job_id: null, bucket: "rendered-videos", thumbnail_path: null, file_name: null, resolution: null, width: null, height: null, duration_sec: null, file_size: null, version: 1, published: true }),
  project_revisions: () => ({ timestamp_sec: null, status: "open", resolved_at: null }),
  project_notes: () => ({}),
  notifications: () => ({ body: null, link: null, read_at: null }),
  waitlist: () => ({ plan_slug: null, source: null }),
  assistant_messages: () => ({}),
  app_settings: () => ({}),
  editing_sessions: () => ({}),
};

/** Colunas geradas pelo banco. */
function generated(table: string, row: Record<string, unknown>) {
  if (table === "projects") {
    const ratios = row.aspect_ratios as string[] | undefined;
    row.aspect_ratio = ratios?.[0] ?? null;
  }
}

type Listener = (c: Change) => void;

/** Regras dos triggers do banco (pastas: no máximo 3 níveis, sem ciclos). */
function guard(rows: Row[], table: string, next: Record<string, unknown>, old: Row | null) {
  if (table !== "folders" || !next.parent_id) return;
  const byId = new Map(rows.map((r) => [r.id, r]));
  const parent = byId.get(String(next.parent_id));
  if (!parent || parent.owner_id !== next.owner_id) throw new Error("folder_parent_invalid");
  let level = 0;
  for (let f: Row | undefined = parent; f && level < 10; f = f.parent_id ? byId.get(String(f.parent_id)) : undefined) {
    if (old && f.id === old.id) throw new Error("folder_cycle");
    level++;
  }
  let height = 1;
  if (old) {
    const depth = (id: string): number => 1 + Math.max(0, ...rows.filter((r) => r.parent_id === id).map((r) => depth(r.id)));
    height = depth(old.id);
  }
  if (level + height > 3) throw new Error("folder_depth");
}

class DemoDb {
  tables: Record<string, Row[]> = {};
  private listeners = new Set<Listener>();
  private saveTimer: number | null = null;

  constructor() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.tables = JSON.parse(raw);
    } catch {
      this.tables = {};
    }
  }

  rows(table: string): Row[] {
    return (this.tables[table] ??= []);
  }

  insert(table: string, values: Record<string, unknown>): Row {
    const t = now();
    const row = { ...(DEFAULTS[table]?.() ?? {}), created_at: t, updated_at: t, ...values } as unknown as Row;
    if (!row.id) row.id = uuid();
    guard(this.rows(table), table, row, null);
    generated(table, row);
    this.rows(table).push(row);
    this.emit({ table, eventType: "INSERT", new: { ...row }, old: null });
    return { ...row };
  }

  update(table: string, match: (r: Row) => boolean, patch: Record<string, unknown>): Row[] {
    const out: Row[] = [];
    for (const r of this.rows(table)) {
      if (!match(r)) continue;
      const old = { ...r };
      if ("parent_id" in patch) guard(this.rows(table), table, { ...r, ...patch }, old);
      Object.assign(r, patch, { updated_at: now() });
      generated(table, r);
      out.push({ ...r });
      this.emit({ table, eventType: "UPDATE", new: { ...r }, old });
    }
    return out;
  }

  delete(table: string, match: (r: Row) => boolean): Row[] {
    const keep: Row[] = [];
    const gone: Row[] = [];
    for (const r of this.rows(table)) (match(r) ? gone : keep).push(r);
    this.tables[table] = keep;
    for (const r of gone) this.emit({ table, eventType: "DELETE", new: { ...r }, old: { ...r } });
    // cascatas mais usadas
    if (table === "projects") for (const r of gone) for (const t of ["project_files", "render_jobs", "renders", "project_revisions", "project_notes"]) this.delete(t, (x) => x.project_id === r.id);
    if (table === "folders") {
      for (const r of gone) {
        this.delete("folders", (x) => x.parent_id === r.id);
        this.update("projects", (x) => x.folder_id === r.id, { folder_id: null });
      }
    }
    return gone;
  }

  on(fn: Listener) {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }

  private emit(c: Change) {
    this.scheduleSave();
    for (const fn of [...this.listeners]) {
      try {
        fn(c);
      } catch (e) {
        console.error("[demo-db]", e);
      }
    }
  }

  private scheduleSave() {
    if (this.saveTimer !== null) return;
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      try {
        localStorage.setItem(KEY, JSON.stringify(this.tables));
      } catch {
        // sem armazenamento (aba anônima): a demonstração segue só na memória
      }
    }, 150);
  }

  reset() {
    this.tables = {};
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignora
    }
  }
}

export const db = new DemoDb();

// ---------------------------------------------------------------------------
// Arquivos (Storage): IndexedDB, com memória como reserva

const files = new Map<string, Blob>();
const urls = new Map<string, string>();
let idb: Promise<IDBDatabase | null> | null = null;

function openIdb(): Promise<IDBDatabase | null> {
  idb ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open("tribuna-demo", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("files");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return idb;
}

export async function putFile(key: string, blob: Blob) {
  files.set(key, blob);
  const d = await openIdb();
  if (!d) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = d.transaction("files", "readwrite");
      tx.objectStore("files").put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getFile(key: string): Promise<Blob | null> {
  const hit = files.get(key);
  if (hit) return hit;
  const d = await openIdb();
  if (!d) return null;
  return new Promise((resolve) => {
    try {
      const req = d.transaction("files").objectStore("files").get(key);
      req.onsuccess = () => {
        const b = (req.result as Blob | undefined) ?? null;
        if (b) files.set(key, b);
        resolve(b);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function removeFile(key: string) {
  files.delete(key);
  const u = urls.get(key);
  if (u) URL.revokeObjectURL(u);
  urls.delete(key);
  const d = await openIdb();
  if (!d) return;
  try {
    d.transaction("files", "readwrite").objectStore("files").delete(key);
  } catch {
    // ignora
  }
}

/** URL estável (blob:) de um arquivo guardado. */
export async function fileUrl(key: string): Promise<string | null> {
  const cached = urls.get(key);
  if (cached) return cached;
  const b = await getFile(key);
  if (!b) return null;
  const u = URL.createObjectURL(b);
  urls.set(key, u);
  return u;
}

export function keyFromUrl(url: string): string | null {
  for (const [k, u] of urls) if (u === url) return k;
  return null;
}
