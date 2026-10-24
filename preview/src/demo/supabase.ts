/**
 * Cliente Supabase de demonstração: o mesmo formato de chamadas do
 * supabase-js (from/select/eq/order..., rpc, storage, auth, realtime), em cima
 * do banco local (db.ts). Serve no lugar dos clientes do servidor, do admin e
 * do navegador, então as páginas e as server actions reais rodam sem mudança.
 */
import { db, fileUrl, getFile, putFile, removeFile, uuid, type Change, type Row } from "./db";
import { rpc } from "./rpc";
import { askGoogleDemo } from "./notice";
import { currentLoc } from "./router";

type Result = { data: unknown; error: { message: string; code?: string } | null; count?: number | null };
type Pred = (r: Row) => boolean;

const SESSION_KEY = "tribuna-demo-session";

export function currentUserId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return memorySession;
  }
}
let memorySession: string | null = null;
export function setSession(id: string | null) {
  memorySession = id;
  try {
    if (id) localStorage.setItem(SESSION_KEY, id);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // sem localStorage: fica na memória
  }
}

function authUser(id: string | null) {
  if (!id) return null;
  const u = db.rows("auth_users").find((x) => x.id === id);
  if (!u) return null;
  return {
    id: u.id,
    email: u.email as string,
    aud: "authenticated",
    role: "authenticated",
    email_confirmed_at: u.email_confirmed_at as string,
    created_at: u.created_at as string,
    user_metadata: (u.user_metadata ?? {}) as Record<string, unknown>,
    app_metadata: (u.app_metadata ?? { provider: "email" }) as Record<string, unknown>,
    identities: [{ id: u.id, provider: (u.app_metadata as { provider?: string })?.provider ?? "email" }],
  };
}

/** Cadastro: cria usuário, perfil, kit de marca e a avaliação (como o trigger handle_new_user). */
export function createUser(email: string, password: string, meta: Record<string, unknown>, provider = "email") {
  const user = db.insert("auth_users", { email, password, user_metadata: meta, app_metadata: { provider }, email_confirmed_at: new Date().toISOString() });
  const name = String(meta.full_name ?? meta.name ?? "").slice(0, 120) || null;
  db.insert("profiles", { id: user.id, email, full_name: name, avatar_url: (meta.avatar_url as string) ?? null, terms_accepted_at: meta.terms_accepted ? new Date().toISOString() : null });
  db.insert("brand_kits", { user_id: user.id, professional_name: name });
  // na demonstração a avaliação usa o Plano Profissional (para dar para testar vários vídeos)
  const trial = db.rows("plans").find((p) => p.slug === "profissional" && p.is_active);
  if (trial) {
    const start = new Date();
    const end = new Date(start.getTime() + Number(trial.trial_days ?? 14) * 86_400_000);
    db.insert("subscriptions", { user_id: user.id, plan_id: trial.id, status: "trialing", provider: "trial", current_period_start: start.toISOString(), current_period_end: end.toISOString() });
  }
  return user;
}

/** Sem login: entra (ou volta) como o visitante deste navegador, como o login anônimo do Supabase. */
export function ensureGuest() {
  if (authUser(currentUserId())) return;
  const guest = db.rows("auth_users").find((u) => (u.app_metadata as { provider?: string } | undefined)?.provider === "anonymous");
  setSession((guest ?? createUser("", uuid(), { terms_accepted: true }, "anonymous")).id);
}

const cmp = (a: unknown, b: unknown) => {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "pt-BR");
};

function likeToRegex(pattern: string, flags: string) {
  const esc = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".");
  return new RegExp(`^${esc}$`, flags);
}

function parseList(v: string) {
  return v.replace(/^\(|\)$/g, "").split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
}

function opPred(col: string, op: string, value: unknown): Pred {
  switch (op) {
    case "eq":
      return (r) => r[col] === value || (value !== null && String(r[col]) === String(value) && r[col] !== null && r[col] !== undefined);
    case "neq":
      return (r) => r[col] !== value;
    case "gt":
      return (r) => cmp(r[col], value) > 0;
    case "gte":
      return (r) => cmp(r[col], value) >= 0;
    case "lt":
      return (r) => cmp(r[col], value) < 0;
    case "lte":
      return (r) => cmp(r[col], value) <= 0;
    case "in": {
      const list = Array.isArray(value) ? value : parseList(String(value));
      return (r) => list.some((x) => x === r[col] || String(x) === String(r[col]));
    }
    case "is":
      return (r) => (value === null || value === "null" ? r[col] === null || r[col] === undefined : r[col] === value);
    case "like":
      return (r) => likeToRegex(String(value), "").test(String(r[col] ?? ""));
    case "ilike":
      return (r) => likeToRegex(String(value), "i").test(String(r[col] ?? ""));
    case "cs":
    case "contains": {
      const list = Array.isArray(value) ? value : parseList(String(value).replace(/^\{|\}$/g, ""));
      return (r) => Array.isArray(r[col]) && list.every((x) => (r[col] as unknown[]).includes(x));
    }
    case "ov":
    case "overlaps": {
      const list = Array.isArray(value) ? value : parseList(String(value).replace(/^\{|\}$/g, ""));
      return (r) => Array.isArray(r[col]) && list.some((x) => (r[col] as unknown[]).includes(x));
    }
    default:
      return () => true;
  }
}

class Query implements PromiseLike<Result> {
  private op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private filters: Pred[] = [];
  private orders: { col: string; asc: boolean; nullsFirst: boolean }[] = [];
  private lim: number | null = null;
  private from_: number | null = null;
  private to_: number | null = null;
  private mode: "single" | "maybe" | null = null;
  private countMode = false;
  private head = false;
  private returning = false;
  private values: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private conflict: string | null = null;
  private ignoreDup = false;

  constructor(private table: string) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.op === "select") {
      this.countMode = Boolean(opts?.count);
      this.head = Boolean(opts?.head);
    } else this.returning = true;
    return this;
  }
  insert(values: Record<string, unknown> | Record<string, unknown>[]) {
    this.op = "insert";
    this.values = values;
    return this;
  }
  upsert(values: Record<string, unknown> | Record<string, unknown>[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.op = "upsert";
    this.values = values;
    this.conflict = opts?.onConflict ?? null;
    this.ignoreDup = Boolean(opts?.ignoreDuplicates);
    return this;
  }
  update(values: Record<string, unknown>, opts?: { count?: string }) {
    this.op = "update";
    this.values = values;
    this.countMode = Boolean(opts?.count);
    return this;
  }
  delete(opts?: { count?: string }) {
    this.op = "delete";
    this.countMode = Boolean(opts?.count);
    return this;
  }
  eq(c: string, v: unknown) {
    this.filters.push(opPred(c, "eq", v));
    return this;
  }
  neq(c: string, v: unknown) {
    this.filters.push(opPred(c, "neq", v));
    return this;
  }
  gt(c: string, v: unknown) {
    this.filters.push(opPred(c, "gt", v));
    return this;
  }
  gte(c: string, v: unknown) {
    this.filters.push(opPred(c, "gte", v));
    return this;
  }
  lt(c: string, v: unknown) {
    this.filters.push(opPred(c, "lt", v));
    return this;
  }
  lte(c: string, v: unknown) {
    this.filters.push(opPred(c, "lte", v));
    return this;
  }
  in(c: string, v: unknown[]) {
    this.filters.push(opPred(c, "in", v));
    return this;
  }
  is(c: string, v: unknown) {
    this.filters.push(opPred(c, "is", v));
    return this;
  }
  like(c: string, v: string) {
    this.filters.push(opPred(c, "like", v));
    return this;
  }
  ilike(c: string, v: string) {
    this.filters.push(opPred(c, "ilike", v));
    return this;
  }
  contains(c: string, v: unknown) {
    this.filters.push(opPred(c, "contains", v));
    return this;
  }
  overlaps(c: string, v: unknown) {
    this.filters.push(opPred(c, "overlaps", v));
    return this;
  }
  match(obj: Record<string, unknown>) {
    for (const [k, v] of Object.entries(obj)) this.eq(k, v);
    return this;
  }
  not(c: string, op: string, v: unknown) {
    const p = opPred(c, op, v);
    this.filters.push((r) => !p(r));
    return this;
  }
  filter(c: string, op: string, v: unknown) {
    this.filters.push(opPred(c, op, v));
    return this;
  }
  or(expr: string) {
    const parts = expr.split(",").map((s) => s.trim().split("."));
    const preds = parts.map(([c, op, ...rest]) => opPred(c, op, rest.join(".")));
    this.filters.push((r) => preds.some((p) => p(r)));
    return this;
  }
  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orders.push({ col, asc: opts?.ascending !== false, nullsFirst: Boolean(opts?.nullsFirst) });
    return this;
  }
  limit(n: number) {
    this.lim = n;
    return this;
  }
  range(a: number, b: number) {
    this.from_ = a;
    this.to_ = b;
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybe";
    return this;
  }
  returns() {
    return this;
  }
  abortSignal() {
    return this;
  }
  throwOnError() {
    return this;
  }

  private matchAll = (r: Row) => this.filters.every((f) => f(r));

  private execute(): Result {
    let rows: Row[];
    switch (this.op) {
      case "insert": {
        const list = Array.isArray(this.values) ? this.values : [this.values!];
        rows = list.map((v) => db.insert(this.table, v));
        break;
      }
      case "upsert": {
        const list = Array.isArray(this.values) ? this.values : [this.values!];
        const keys = (this.conflict ?? "id").split(",").map((s) => s.trim());
        rows = [];
        for (const v of list) {
          const hit = db.rows(this.table).find((r) => keys.every((k) => v[k] !== undefined && r[k] === v[k]));
          if (hit) {
            if (!this.ignoreDup) rows.push(...db.update(this.table, (r) => r.id === hit.id, v));
          } else rows.push(db.insert(this.table, v));
        }
        break;
      }
      case "update":
        rows = db.update(this.table, this.matchAll, this.values as Record<string, unknown>);
        break;
      case "delete":
        rows = db.delete(this.table, this.matchAll);
        break;
      default:
        rows = db.rows(this.table).filter(this.matchAll).map((r) => ({ ...r }));
    }
    if (this.op !== "select" && !this.returning) return { data: null, error: null, count: this.countMode ? rows.length : null };
    const count = rows.length;
    for (const o of [...this.orders].reverse()) {
      rows.sort((a, b) => {
        const av = a[o.col];
        const bv = b[o.col];
        const an = av === null || av === undefined;
        const bn = bv === null || bv === undefined;
        if (an || bn) return an === bn ? 0 : (an ? (o.nullsFirst ? -1 : 1) : o.nullsFirst ? 1 : -1);
        const c = cmp(av, bv);
        return o.asc ? c : -c;
      });
    }
    if (this.from_ !== null) rows = rows.slice(this.from_, (this.to_ ?? rows.length - 1) + 1);
    if (this.lim !== null) rows = rows.slice(0, this.lim);
    if (this.head) return { data: null, error: null, count };
    if (this.mode === "single") {
      if (rows.length !== 1) return { data: null, error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" }, count: this.countMode ? count : null };
      return { data: rows[0], error: null, count: this.countMode ? count : null };
    }
    if (this.mode === "maybe") return { data: rows[0] ?? null, error: null, count: this.countMode ? count : null };
    return { data: rows, error: null, count: this.countMode ? count : null };
  }

  then<A = Result, B = never>(ok?: ((v: Result) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
    let res: Result;
    try {
      res = this.execute();
    } catch (e) {
      res = { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
    }
    return Promise.resolve(res).then(ok, bad);
  }
}

// ---------------------------------------------------------------------------

type Handler = { table: string; event: string; filter: Pred | null; cb: (p: { eventType: string; new: Row; old: Row | null }) => void };

class Channel {
  handlers: Handler[] = [];
  off: (() => void) | null = null;
  constructor(public name: string) {}
  on(_type: string, spec: { event?: string; table?: string; filter?: string }, cb: Handler["cb"]) {
    let filter: Pred | null = null;
    const m = spec.filter?.match(/^(\w+)=(\w+)\.(.+)$/);
    if (m) filter = opPred(m[1], m[2], m[3]);
    this.handlers.push({ table: spec.table ?? "*", event: spec.event ?? "*", filter, cb });
    return this;
  }
  subscribe(cb?: (status: string) => void) {
    this.off = db.on((c: Change) => {
      for (const h of this.handlers) {
        if (h.table !== "*" && h.table !== c.table) continue;
        if (h.event !== "*" && h.event !== c.eventType) continue;
        if (h.filter && !h.filter(c.new)) continue;
        // como o Realtime: entrega depois da transação
        queueMicrotask(() => h.cb({ eventType: c.eventType, new: c.new, old: c.old }));
      }
    });
    cb?.("SUBSCRIBED");
    return this;
  }
  unsubscribe() {
    this.off?.();
    this.off = null;
    return Promise.resolve("ok");
  }
}

function storageFrom(bucket: string) {
  const key = (p: string) => `${bucket}/${p}`;
  return {
    async upload(path: string, file: Blob, _opts?: unknown) {
      await putFile(key(path), file);
      db.insert("storage_objects", { bucket, name: path, size: file.size, mime: file.type });
      return { data: { path, fullPath: key(path), id: uuid() }, error: null };
    },
    async update(path: string, file: Blob) {
      await putFile(key(path), file);
      return { data: { path }, error: null };
    },
    async createSignedUrl(path: string, _exp?: number, _o?: unknown) {
      const u = await fileUrl(key(path));
      return u ? { data: { signedUrl: u }, error: null } : { data: null, error: { message: "Object not found" } };
    },
    async createSignedUrls(paths: string[], _exp?: number) {
      const data = await Promise.all(paths.map(async (p) => ({ path: p, signedUrl: (await fileUrl(key(p))) ?? "", error: null })));
      return { data, error: null };
    },
    async createSignedUploadUrl(path: string) {
      return { data: { signedUrl: `demo-upload:${key(path)}`, token: "demo", path }, error: null };
    },
    async uploadToSignedUrl(path: string, _token: string, file: Blob) {
      await putFile(key(path), file);
      return { data: { path }, error: null };
    },
    async download(path: string) {
      const b = await getFile(key(path));
      return b ? { data: b, error: null } : { data: null, error: { message: "Object not found" } };
    },
    async remove(paths: string[]) {
      for (const p of paths) {
        await removeFile(key(p));
        db.delete("storage_objects", (r) => r.bucket === bucket && r.name === p);
      }
      return { data: paths.map((name) => ({ name })), error: null };
    },
    async list(prefix = "", _o?: unknown) {
      const p = prefix ? `${prefix.replace(/\/$/, "")}/` : "";
      const data = db
        .rows("storage_objects")
        .filter((r) => r.bucket === bucket && String(r.name).startsWith(p))
        .map((r) => ({ name: String(r.name).slice(p.length), id: r.id, metadata: { size: r.size, mimetype: r.mime } }));
      return { data, error: null };
    },
    getPublicUrl(path: string) {
      return { data: { publicUrl: `demo-public:${key(path)}` } };
    },
  };
}

const authApi = {
  async getUser() {
    const user = authUser(currentUserId());
    return user ? { data: { user }, error: null } : { data: { user: null }, error: { message: "Auth session missing!", code: "session_not_found" } };
  },
  async getSession() {
    const user = authUser(currentUserId());
    return { data: { session: user ? { access_token: "demo", user } : null }, error: null };
  },
  async getClaims() {
    const id = currentUserId();
    return { data: id ? { claims: { sub: id } } : null, error: null };
  },
  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, unknown> } }) {
    const exists = db.rows("auth_users").find((u) => String(u.email).toLowerCase() === email.toLowerCase());
    if (exists) return { data: { user: null, session: null }, error: { message: "User already registered", code: "user_already_exists" } };
    const u = createUser(email, password, options?.data ?? {});
    // na demonstração o e-mail já sai confirmado; a tela "Confira seu e-mail" segue para o onboarding
    setSession(u.id);
    return { data: { user: authUser(u.id), session: { access_token: "demo" } }, error: null };
  },
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const u = db.rows("auth_users").find((x) => String(x.email).toLowerCase() === email.toLowerCase());
    if (!u || u.password !== password) return { data: { user: null, session: null }, error: { message: "Invalid login credentials", code: "invalid_credentials" } };
    setSession(u.id);
    return { data: { user: authUser(u.id), session: { access_token: "demo" } }, error: null };
  },
  async signInWithOAuth({ options }: { provider: string; options?: { redirectTo?: string } }) {
    // "Voltar": continua na mesma tela, sem erro
    if (!(await askGoogleDemo())) return { data: { url: `${currentLoc().path}${currentLoc().search}`, provider: "google" }, error: null };
    // Google de demonstração: entra (ou cria) a conta do Guilherme
    let u = db.rows("auth_users").find((x) => x.email === "guilherme@demo.tribuna");
    if (!u) u = createUser("guilherme@demo.tribuna", uuid(), { full_name: "Guilherme", terms_accepted: true }, "google");
    setSession(u.id);
    const next = options?.redirectTo ? new URL(options.redirectTo, location.href).searchParams.get("next") : null;
    return { data: { url: next || "/app", provider: "google" }, error: null };
  },
  async signInAnonymously() {
    ensureGuest();
    return { data: { user: authUser(currentUserId()), session: { access_token: "demo" } }, error: null };
  },
  async signOut() {
    setSession(null);
    return { error: null };
  },
  async updateUser(attrs: { password?: string; email?: string; data?: Record<string, unknown> }) {
    const id = currentUserId();
    if (!id) return { data: { user: null }, error: { message: "Auth session missing!" } };
    const patch: Record<string, unknown> = {};
    if (attrs.password) patch.password = attrs.password;
    if (attrs.email) patch.email = attrs.email;
    if (attrs.data) patch.user_metadata = { ...(db.rows("auth_users").find((u) => u.id === id)?.user_metadata as object), ...attrs.data };
    db.update("auth_users", (u) => u.id === id, patch);
    if (attrs.email) db.update("profiles", (p) => p.id === id, { email: attrs.email });
    return { data: { user: authUser(id) }, error: null };
  },
  async resend() {
    return { data: {}, error: null };
  },
  async resetPasswordForEmail() {
    return { data: {}, error: null };
  },
  async exchangeCodeForSession() {
    return { data: {}, error: null };
  },
  async verifyOtp() {
    return { data: {}, error: null };
  },
  onAuthStateChange() {
    return { data: { subscription: { unsubscribe() {} } } };
  },
  admin: {
    async deleteUser(id: string) {
      db.delete("auth_users", (u) => u.id === id);
      for (const t of ["profiles"]) db.delete(t, (r) => r.id === id);
      for (const t of ["brand_kits", "subscriptions", "projects", "notifications", "usage", "payments", "assistant_messages"]) db.delete(t, (r) => r.user_id === id);
      db.delete("folders", (r) => r.owner_id === id);
      if (currentUserId() === id) setSession(null);
      return { data: {}, error: null };
    },
    async getUserById(id: string) {
      return { data: { user: authUser(id) }, error: null };
    },
    async listUsers() {
      return { data: { users: db.rows("auth_users").map((u) => authUser(u.id)) }, error: null };
    },
    async updateUserById(id: string, attrs: Record<string, unknown>) {
      db.update("auth_users", (u) => u.id === id, attrs);
      return { data: { user: authUser(id) }, error: null };
    },
  },
};

export function createDemoClient() {
  return {
    from: (table: string) => new Query(table),
    rpc: (fn: string, args?: Record<string, unknown>) => rpc(fn, args ?? {}),
    storage: { from: storageFrom },
    auth: authApi,
    channel: (name: string) => new Channel(name),
    removeChannel: (ch: Channel) => ch.unsubscribe(),
    removeAllChannels: () => Promise.resolve([]),
  };
}

export type DemoClient = ReturnType<typeof createDemoClient>;
